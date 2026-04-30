import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PostImage } from "@/components/PostImage";
import { FullArticle } from "@/components/FullArticle";
import { InfiniteArticleLoader } from "@/components/InfiniteArticleLoader";
import { StickySidebarContent } from "@/components/StickySidebarContent";
import { StartupEventsSection } from "@/components/StartupEventsSection";
import {
  getPostsByCategory,
  getStartupEvents,
  hasThumbnail,
  getPostBySlug,
  getRelatedPosts,
  getMoreNewsSlugs,
  getPrevNextPosts,
} from "@/lib/data-adapter";
import { getPostPath, normalizePostSlugForCategory } from "@/lib/post-utils";

type CatchAllParams = {
  slug: string[];
};

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const revalidate = 60;
export const dynamicParams = true;

function formatTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function renderCategoryPage(slug: string) {
  const posts = await getPostsByCategory(slug, 20);

  if (posts.length === 0) {
    notFound();
  }

  const title = formatTitle(slug);
  const listPosts = posts.slice(0, 20);
  const heroPost = listPosts[0] ?? null;
  const remainingPosts = listPosts.slice(1);
  const startupEvents = await getStartupEvents();

  const toBackgroundStyle = (imageUrl?: string | null): CSSProperties | undefined => {
    if (!imageUrl || !imageUrl.trim()) return undefined;
    return {
      backgroundImage: `url("${imageUrl}")`,
    };
  };

  return (
    <div className="mvp-main-blog-wrap left relative">
      <div className="mvp-main-box">
        <div className="mvp-main-blog-cont left relative">
          <nav className="event-by-country-breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="event-by-country-breadcrumb-link">
              Home
            </Link>
            <span className="event-by-country-breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <span className="event-by-country-breadcrumb-current" aria-current="page">
              {title}
            </span>
          </nav>
          <h1 className="mvp-feat1-pop-head sector-page-theme-title">
            <span className="mvp-feat1-pop-head">{title}</span>
          </h1>

          {heroPost && (
            <div className="sector-hero-wrap left relative">
              <Link href={getPostPath(heroPost)} rel="bookmark" className="sector-hero-link">
                <div className="sector-hero-image-wrap left relative">
                  <div className="sector-hero-image-bg" aria-hidden style={toBackgroundStyle(heroPost.image)} />
                  <div className="sector-hero-image-fg">
                    <PostImage
                      src={heroPost.image || ""}
                      alt={heroPost.title}
                      fill
                      sizes="100vw"
                      imageStyle={{ objectFit: "contain" }}
                    />
                  </div>
                </div>
                <div className="sector-hero-overlay" />
                <div className="sector-hero-content">
                  <h1 className="sector-hero-title">{heroPost.title}</h1>
                </div>
              </Link>
            </div>
          )}

          <div className="mvp-main-blog-out left relative">
            <div className="mvp-main-blog-in">
              <div className="mvp-main-blog-body left relative">
                <ul className="mvp-blog-story-list left relative infinite-content">
                  {remainingPosts.map((post) => (
                    <li key={post.id} className="mvp-blog-story-wrap left relative infinite-post">
                      <Link href={getPostPath(post)} rel="bookmark">
                        <div className="mvp-blog-story-out relative">
                          {hasThumbnail(post) && (
                            <div className="mvp-blog-story-img left relative">
                              <div className="sector-thumb-image-bg" aria-hidden style={toBackgroundStyle(post.image)} />
                              <div className="sector-thumb-image-fg">
                                <PostImage
                                  src={post.image || ""}
                                  alt={post.title}
                                  fill
                                  sizes="(max-width: 767px) 100vw, 800px"
                                  imageStyle={{ objectFit: "contain" }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="mvp-blog-story-in">
                            <div className="mvp-blog-story-text left relative">
                              <div className="mvp-cat-date-wrap left relative">
                                {/* srishti */}
                                {/* <span className="mvp-cd-date left relative">{post.timeAgo}</span> */}
                              </div>
                              <h2 className="post-heading-max-3-lines">{post.title}</h2>
                              <p className="post-card-excerpt-max-3-lines">{post.excerpt}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mvp-inf-more-wrap left relative">
                  <Link href="/news" className="mvp-inf-more-but">
                    More Posts
                  </Link>
                  <div className="mvp-nav-links">
                    {/* srishti */}
                    {/* <Link href="/news">Page 1 of 1</Link> */}
                  </div>
                </div>
              </div>
            </div>
            <div id="mvp-side-wrap" className="left relative theiaStickySidebar">
              <StickySidebarContent>
                <StartupEventsSection events={startupEvents} showLocationTag={false} />
              </StickySidebarContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function resolvePostByCategoryAndPath(categorySlug: string, postPath: string) {
  const path = (postPath || '').replace(/^\/+|\/+$/g, '');
  if (!path) return null;

  // Build base candidates (with and without the category prefix).
  const base = new Set<string>();
  base.add(path);
  if (path.startsWith(`${categorySlug}/`)) {
    base.add(path.slice(categorySlug.length + 1));
  } else {
    base.add(`${categorySlug}/${path}`);
  }

  // Also try trailing-slash variants to tolerate legacy slugs that were
  // stored with a trailing "/" (e.g. imported from WordPress permalinks).
  const candidates = new Set<string>();
  for (const c of base) {
    candidates.add(c);
    candidates.add(`${c}/`);
  }

  for (const candidate of candidates) {
    const post = await getPostBySlug(candidate);
    if (post && post.categorySlug === categorySlug) {
      return post;
    }
  }

  return null;
}

async function renderPostPage(categorySlug: string, postPath: string) {
  const post = await resolvePostByCategoryAndPath(categorySlug, postPath);
  if (!post) notFound();

  const canonicalLeaf = normalizePostSlugForCategory(categorySlug, post.slug);
  const incomingLeaf = (postPath || '').replace(/^\/+|\/+$/g, '');
  if (incomingLeaf !== canonicalLeaf) {
    permanentRedirect(`/${categorySlug}/${canonicalLeaf}`);
  }

  const [related, { prev, next }, availableSlugs] = await Promise.all([
    getRelatedPosts(post.slug, post.categorySlug, 6),
    getPrevNextPosts(post.slug),
    getMoreNewsSlugs([post.id]),
  ]);

  return (
    <div id="mvp-post-main-container">
      <FullArticle post={post} related={related} prev={prev} next={next} />
      <InfiniteArticleLoader initialPosts={[post]} availableSlugs={availableSlugs} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<CatchAllParams> }): Promise<Metadata> {
  const { slug: segments = [] } = await params;

  if (segments.length === 1) {
    const [categorySlug] = segments;
    const displayName = formatTitle(categorySlug);
    const title = `${displayName} News & Updates`;
    const description = `Latest ${displayName} startup news, funding rounds, and industry analysis on StartupNews.fyi.`;

    return {
      title,
      description,
      alternates: { canonical: `${SITE_BASE}/${categorySlug}` },
      openGraph: {
        title,
        description,
        url: `${SITE_BASE}/${categorySlug}`,
        siteName: "StartupNews.fyi",
        type: "website",
      },
      twitter: { card: "summary", title, description },
    };
  }

  if (segments.length >= 2) {
    const [categorySlug, ...postParts] = segments;
    const postPath = postParts.join('/');
    const post = await resolvePostByCategoryAndPath(categorySlug, postPath);
    if (!post) {
      return { title: "Post not found" };
    }

    const title = post.title || "StartupNews.fyi";
    const description = (post.metaDescription || post.excerpt || "").slice(0, 160);
    const image = post.image && !post.image.includes("unsplash.com/photo-1504711434969") ? post.image : undefined;
    const postUrl = `${SITE_BASE}/${post.categorySlug}/${normalizePostSlugForCategory(post.categorySlug, post.slug)}`;

    return {
      title,
      description: description || undefined,
      alternates: { canonical: postUrl },
      openGraph: {
        type: "article",
        title,
        description: description || undefined,
        url: postUrl,
        siteName: "StartupNews.fyi",
        publishedTime: post.publishedAt || post.date,
        section: post.category,
        tags: post.tags,
        ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: description || undefined,
        ...(image && { images: [image] }),
      },
    };
  }

  return { title: "StartupNews.fyi" };
}

export default async function CatchAllPage({ params }: { params: Promise<CatchAllParams> }) {
  const { slug: segments = [] } = await params;

  if (segments.length === 1) {
    return renderCategoryPage(segments[0]);
  }

  if (segments.length >= 2) {
    const [categorySlug, ...postParts] = segments;
    return renderPostPage(categorySlug, postParts.join('/'));
  }

  notFound();
}