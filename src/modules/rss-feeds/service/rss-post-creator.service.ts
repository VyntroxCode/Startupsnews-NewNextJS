import type { RssFeedEntity } from "../domain/types";
import type { ParsedRssItem } from "../domain/types";
import { PostsRepository } from "@/modules/posts/repository/posts.repository";
import { slugify } from "@/shared/utils/string.utils";
import { invalidatePostsListCache } from "@/shared/cache/redis.client";
import {
  downloadAndUploadFeaturedToS3,
  downloadAndUploadToS3,
  downloadImage,
  getContentType,
  isValidFeaturedImage,
  normalizeSourceImageUrl,
  s3KeyForRssImage,
  uploadImageToS3,
} from "../utils/image-to-s3";
import {
  extractArticleHtml,
  extractImageUrlsFromHtml,
  extractPrimaryImageFromHtml,
  isLikelyLogoUrl,
  selectBestContentImageUrl,
} from "../utils/content-extract";

const ARTICLE_FETCH_TIMEOUT_MS = 15000;
const MAX_SLUG_LENGTH = 500;

export class RssPostCreatorService {
  private postsRepo = new PostsRepository();

  private isOurS3Url(url: string): boolean {
    try {
      const u = new URL(url);
      const host = u.hostname;
      return (
        host === "startupnews-media-2026.s3.us-east-1.amazonaws.com" ||
        host === "s3.amazonaws.com" ||
        (host.endsWith(".s3.us-east-1.amazonaws.com") &&
          host.startsWith("startupnews-media-2026."))
      );
    } catch {
      return false;
    }
  }

  async createPostFromRssItem(
    item: ParsedRssItem,
    feed: RssFeedEntity,
    contentTemplate?: string,
    titleTemplate?: string,
  ): Promise<{ postId: number; slug: string }> {
    const link = item.link || "";
    const baseUrl = link ? new URL(link).origin : "";

    // 1) Get article HTML: prefer fetching full page for full body; fallback to RSS content
    let articleHtml = item.content || "";
    // Fetch full page when RSS gives little content (e.g. short snippet) so single post page shows full article
    const rssContentTooShort = !articleHtml || articleHtml.length < 800;
    let fetchedPageHtml = "";
    if (link && rssContentTooShort) {
      try {
        const res = await fetch(link, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "text/html",
          },
          signal: AbortSignal.timeout(ARTICLE_FETCH_TIMEOUT_MS),
        });
        if (res.ok) {
          const html = await res.text();
          fetchedPageHtml = html;
          const extracted = extractArticleHtml(html);
          if (extracted && extracted.length > (articleHtml?.length || 0)) {
            articleHtml = extracted;
          }
        }
      } catch {
        // keep articleHtml from RSS
      }
    }
    if (!articleHtml || !articleHtml.trim())
      articleHtml = item.description || item.content || "<p>No content.</p>";

    // 2) Extract image URLs and upload to S3, build replacements; track which are valid for featured (not tiny/placeholder).
    const imageUrls = extractImageUrlsFromHtml(articleHtml, baseUrl);
    const urlToS3 = new Map<string, string>();
    const validFeaturedUrls = new Set<string>();
    const uniqueBase = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const buf = await downloadImage(url);
      if (!buf) continue;
      const validForFeatured = isValidFeaturedImage(buf);
      const key = s3KeyForRssImage(`${uniqueBase}-${i}`, url);
      const contentType = getContentType(url);
      try {
        const s3Url = await uploadImageToS3(key, buf, contentType);
        urlToS3.set(url, s3Url);
        if (validForFeatured) validFeaturedUrls.add(url);
      } catch {
        // skip
      }
    }
    let matchedContent = articleHtml;
    for (const [oldUrl, newUrl] of urlToS3) {
      matchedContent = matchedContent.split(oldUrl).join(newUrl);
    }

    // 3) Featured image: prioritize the first valid image from the article content. If none exist, fallback to OG/Twitter meta or RSS enclosure.
    let featuredImageUrl: string | null = null;

    // 3a) Prefer first non-logo image from article content that is valid for featured (not tiny/white/placeholder).
    if (imageUrls.length > 0) {
      const bestContentUrl =
        selectBestContentImageUrl(imageUrls) ?? imageUrls[0];
      if (
        validFeaturedUrls.has(bestContentUrl) &&
        urlToS3.has(bestContentUrl)
      ) {
        featuredImageUrl = urlToS3.get(bestContentUrl)!;
      } else {
        const firstValid = imageUrls.find(
          (u) => validFeaturedUrls.has(u) && urlToS3.has(u),
        );
        if (firstValid) featuredImageUrl = urlToS3.get(firstValid)!;
      }
    }

    // 3b) Fetch page if we don't have it yet, so we can try og:image as fallback.
    if (!featuredImageUrl && !fetchedPageHtml && link) {
      try {
        const res = await fetch(link, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Accept: "text/html",
          },
          signal: AbortSignal.timeout(ARTICLE_FETCH_TIMEOUT_MS),
        });
        if (res.ok) {
          fetchedPageHtml = await res.text();
        }
      } catch {
        // ignore
      }
    }

    // Fallback to primary meta image (og:image)
    if (!featuredImageUrl && fetchedPageHtml && baseUrl) {
      const primaryMetaImage = extractPrimaryImageFromHtml(
        fetchedPageHtml,
        baseUrl,
      );
      if (primaryMetaImage && !isLikelyLogoUrl(primaryMetaImage)) {
        const s3Meta = await downloadAndUploadFeaturedToS3(
          primaryMetaImage,
          `${uniqueBase}-meta`,
        );
        if (s3Meta) featuredImageUrl = s3Meta;
      }
    }

    // Further fallback: if we only had content images but they weren't big enough for featured (not in validFeaturedUrls), use the first one if it's already on S3.
    if (!featuredImageUrl && imageUrls.length > 0) {
      const first = normalizeSourceImageUrl(imageUrls[0]);
      if (this.isOurS3Url(first)) featuredImageUrl = first;
    }

    // 3c) RSS item image (enclosure / first img in feed) only if not logo and passes size/dimension validation.
    if (!featuredImageUrl && item.imageUrl && !isLikelyLogoUrl(item.imageUrl)) {
      const s3Feat = await downloadAndUploadFeaturedToS3(
        normalizeSourceImageUrl(item.imageUrl),
        `${uniqueBase}-feat`,
      );
      if (s3Feat) featuredImageUrl = s3Feat;
    }

    // Never use Unsplash or other default URLs as thumbnail – treat as no image (post will be draft).
    if (
      featuredImageUrl &&
      featuredImageUrl.startsWith("https://images.unsplash.com/")
    ) {
      featuredImageUrl = null;
    }

    // 4) Build title and content from template placeholders
    const title = this.applyTemplate(titleTemplate || "[original_title]", {
      original_title: item.title,
    });
    const productImgsHtml =
      imageUrls.length > 0
        ? imageUrls
          .slice(0, 10)
          .map((url) => urlToS3.get(url))
          .filter(Boolean)
          .map((url) => `<img src="${url}" alt="" />`)
          .join("\n")
        : "";
    const content = this.applyTemplate(
      contentTemplate ||
      '[ad_1]\n<br>[matched_content]\n<br>[ad_2]\n<br><a href="[source_link]">Source link</a>',
      {
        matched_content: matchedContent,
        product_imgs_html: productImgsHtml,
        source_link: link,
        ad_1: "",
        ad_2: "",
      },
    );

    const excerpt = (
      item.description || matchedContent.replace(/<[^>]*>/g, " ").slice(0, 500)
    )
      .trim()
      .slice(0, 2000);

    const baseSlug = (slugify(item.title) || "post").slice(
      0,
      MAX_SLUG_LENGTH - 15,
    );
    let slug = (baseSlug || `post-${Date.now().toString(36)}`).slice(
      0,
      MAX_SLUG_LENGTH,
    );
    let existing = await this.postsRepo.findBySlug(slug);
    let suffix = 0;
    while (existing && suffix < 1000) {
      slug = `${baseSlug || "post"}-${Date.now().toString(36)}-${suffix}`.slice(
        0,
        MAX_SLUG_LENGTH,
      );
      existing = await this.postsRepo.findBySlug(slug);
      suffix++;
    }

    // Publish when auto-publish is enabled and post has body + any valid featured thumbnail.
    // Do not require <img> tags in article content because many feeds provide image only via enclosure/og:image.
    const hasValidThumbnail =
      !!featuredImageUrl && featuredImageUrl.trim().length > 0;
    const hasBody = typeof content === "string" && content.trim().length > 0;
    const published = feed.auto_publish && hasValidThumbnail && hasBody ? 1 : 0;
    const post = await this.postsRepo.create({
      title: title.slice(0, 500),
      slug,
      excerpt,
      content,
      categoryId: feed.category_id,
      authorId: feed.author_id,
      featuredImageUrl: featuredImageUrl || undefined,
      featuredImageSmallUrl: featuredImageUrl || undefined,
      format: "standard",
      status: published ? "published" : "draft",
      featured: false,
    });

    await invalidatePostsListCache();
    return { postId: post.id, slug: post.slug };
  }

  private applyTemplate(
    template: string,
    vars: Record<string, string>,
  ): string {
    let out = template;
    for (const [key, value] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\[${key}\\]`, "gi"), value || "");
    }
    return out;
  }
}
