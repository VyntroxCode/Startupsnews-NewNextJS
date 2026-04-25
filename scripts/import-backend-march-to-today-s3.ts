import { loadEnvConfig } from '@next/env';
import { getDbConnection, closeDbConnection, query, queryOne } from '../src/shared/database/connection';
import { slugify } from '../src/shared/utils/string.utils';
import {
  downloadAndUploadFeaturedToS3,
  downloadAndUploadToS3,
  isOurS3ImageUrl,
  normalizeSourceImageUrl,
} from '../src/modules/rss-feeds/utils/image-to-s3';
import {
  extractImageUrlsFromHtml,
  selectBestContentImageUrl,
} from '../src/modules/rss-feeds/utils/content-extract';

loadEnvConfig(process.cwd());

const SOURCE_BASE = (process.env.IMPORT_SOURCE_BASE || process.env.WP_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');
const WP_POSTS_ENDPOINT = `${SOURCE_BASE}/wp-json/wp/v2/posts`;
const START_DATE = process.env.IMPORT_FROM_DATE || '2026-03-01T00:00:00Z';
const END_DATE = process.env.IMPORT_TO_DATE || new Date().toISOString();
const PER_PAGE = Number(process.env.IMPORT_PER_PAGE || '50');
const START_PAGE = Number(process.env.IMPORT_START_PAGE || '1');
const END_PAGE = Number(process.env.IMPORT_END_PAGE || '0');
const MAX_RETRIES = Number(process.env.IMPORT_PAGE_RETRIES || '4');
const CONTENT_IMAGE_LIMIT = Number(process.env.IMPORT_CONTENT_IMAGE_LIMIT || '8');
const MIN_BODY_WORDS = Number(process.env.IMPORT_MIN_BODY_WORDS || '500');
const IMPORT_FEED_NAME = process.env.IMPORT_FEED_NAME || 'StartupNews Direct Import';
const DEFAULT_AUTHOR_NAME = 'StartupNews Desk';

const SECTOR_SLUGS = [
  'tech',
  'business',
  'ai-deeptech',
  'funding',
  'fintech',
  'social-media',
  'robotics',
  'healthtech',
  'ev-mobility',
  'ecommerce',
  'saas-enterprise',
  'consumer-d2c',
  'web3-blockchain',
  'cyber-security',
  'climate-energy',
];

const KEYWORDS: Record<string, string[]> = {
  'ai-deeptech': ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'deep tech', 'deeptech'],
  fintech: ['fintech', 'finance', 'payments', 'bank', 'lending', 'insurance', 'crypto'],
  'social-media': ['social', 'creator', 'influencer', 'instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'],
  robotics: ['robot', 'robotics', 'automation', 'drone', 'autonomous'],
  healthtech: ['health', 'healthcare', 'medical', 'biotech', 'pharma', 'wellness', 'telemedicine'],
  'ev-mobility': ['ev', 'electric vehicle', 'mobility', 'transport', 'battery', 'charging'],
  ecommerce: ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'shopping', 'delivery'],
  'saas-enterprise': ['saas', 'enterprise', 'b2b', 'software', 'cloud', 'api', 'platform'],
  'consumer-d2c': ['d2c', 'direct-to-consumer', 'consumer', 'brand'],
  'web3-blockchain': ['web3', 'blockchain', 'nft', 'defi', 'crypto', 'token'],
  'cyber-security': ['cybersecurity', 'cyber security', 'security', 'breach', 'threat', 'encryption', 'privacy'],
  'climate-energy': ['climate', 'energy', 'renewable', 'solar', 'wind', 'sustainability', 'carbon'],
  tech: ['technology', 'tech', 'startup', 'software', 'internet', 'digital'],
  business: ['business', 'economy', 'market', 'industry', 'company', 'enterprise'],
  funding: ['funding', 'fund raise', 'seed', 'series a', 'series b', 'valuation', 'vc'],
};

type WpRendered = { rendered?: string };

type WpFeaturedMedia = {
  source_url?: string;
};

type WpEmbedded = {
  'wp:featuredmedia'?: WpFeaturedMedia[];
  author?: Array<{ id?: number; name?: string }>;
};

type WpPost = {
  id: number;
  date: string;
  slug: string;
  link: string;
  author?: number;
  title?: WpRendered;
  excerpt?: WpRendered;
  content?: WpRendered;
  _embedded?: WpEmbedded;
};

function stripHtml(input: string): string {
  return (input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function toAbsoluteUrl(rawUrl: string, baseUrl: string): string {
  const src = normalizeSourceImageUrl(rawUrl);
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return `${baseUrl}${src}`;
  return `${baseUrl}/${src.replace(/^\/+/, '')}`;
}

function categorySlug(title: string, excerpt: string, content: string): string {
  const text = `${title} ${excerpt} ${content}`.toLowerCase();
  let best = 'ai-deeptech';
  let bestScore = 0;

  for (const [slug, words] of Object.entries(KEYWORDS)) {
    let score = 0;
    for (const w of words) {
      if (text.includes(w)) score += w.length;
    }
    if (score > bestScore) {
      best = slug;
      bestScore = score;
    }
  }

  return best;
}

function extractFeaturedImage(post: WpPost, contentHtml: string): string {
  const embedded = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
  if (embedded) return normalizeSourceImageUrl(embedded);

  const fromContent = extractImageUrlsFromHtml(contentHtml || '', SOURCE_BASE);
  const bestFromContent = selectBestContentImageUrl(fromContent);
  if (bestFromContent) return normalizeSourceImageUrl(bestFromContent);
  if (fromContent.length > 0) return normalizeSourceImageUrl(fromContent[0]);

  return '';
}

function getBodyWordCount(contentHtml: string): number {
  const text = stripHtml(contentHtml || '');
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeAuthorName(input: string): string {
  const normalized = stripHtml(input || '').replace(/\s+/g, ' ').trim();
  return normalized || DEFAULT_AUTHOR_NAME;
}

function authorEmail(authorName: string): string {
  const slug = slugify(authorName).slice(0, 40) || 'author';
  const suffix = String(Math.abs(hashString(authorName))).slice(0, 8);
  return `${slug}-${suffix}@authors.startupnews.fyi`;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function trimToMax(value: string, max: number): string {
  return (value || '').slice(0, max);
}

function trimToMaxBytes(value: string, maxBytes: number): string {
  const input = value || '';
  if (Buffer.byteLength(input, 'utf8') <= maxBytes) return input;

  let low = 0;
  let high = input.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const chunk = input.slice(0, mid);
    if (Buffer.byteLength(chunk, 'utf8') <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return input.slice(0, low);
}

async function getOrCreateAuthorId(authorNameRaw: string, passwordHash: string): Promise<number> {
  const name = normalizeAuthorName(authorNameRaw);
  const email = authorEmail(name);

  const existingByEmail = await queryOne<{ id: number }>('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (existingByEmail?.id) return existingByEmail.id;

  const existingByName = await queryOne<{ id: number }>('SELECT id FROM users WHERE role = ? AND LOWER(name) = LOWER(?) LIMIT 1', ['author', name]);
  if (existingByName?.id) return existingByName.id;

  await query(
    `INSERT INTO users (email, password_hash, name, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'author', 1, NOW(), NOW())`,
    [email, passwordHash, name]
  );

  const created = await queryOne<{ id: number }>('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (!created?.id) throw new Error(`Failed to create author for ${name}`);
  return created.id;
}

async function getOrCreateImportFeedId(defaultCategoryId: number, fallbackAuthorId: number): Promise<number> {
  const existing = await queryOne<{ id: number }>('SELECT id FROM rss_feeds WHERE url = ? LIMIT 1', [SOURCE_BASE]);
  if (existing?.id) return existing.id;

  await query(
    `INSERT INTO rss_feeds (
      name, url, category_id, author_id, enabled, fetch_interval_minutes,
      max_items_per_fetch, auto_publish, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 1, 60, 50, 1, NOW(), NOW())`,
    [IMPORT_FEED_NAME, SOURCE_BASE, defaultCategoryId, fallbackAuthorId]
  );

  const created = await queryOne<{ id: number }>('SELECT id FROM rss_feeds WHERE url = ? LIMIT 1', [SOURCE_BASE]);
  if (!created?.id) throw new Error('Failed to create import rss feed record');
  return created.id;
}

async function rewriteImageAttributesToS3(html: string, uniquePrefix: string): Promise<{ content: string; uploadedImageCount: number }> {
  const ATTR_REGEX = /(\s(?:src|data-src|data-lazy-src|data-original)=['"])([^'"]+)(['"])/gi;
  let result = '';
  let lastIndex = 0;
  let uploadedImageCount = 0;
  const cache = new Map<string, string>();
  let processed = 0;
  let match: RegExpExecArray | null;

  while ((match = ATTR_REGEX.exec(html)) !== null) {
    const [full, prefix, rawUrl, suffix] = match;
    const matchIndex = match.index;

    result += html.slice(lastIndex, matchIndex);

    const absoluteUrl = toAbsoluteUrl(rawUrl, SOURCE_BASE);
    let replacedUrl = rawUrl;

    if (absoluteUrl && !absoluteUrl.startsWith('data:') && !isOurS3ImageUrl(absoluteUrl) && processed < CONTENT_IMAGE_LIMIT) {
      if (!cache.has(absoluteUrl)) {
        const uploaded = await downloadAndUploadToS3(absoluteUrl, `${uniquePrefix}-${processed}`);
        if (uploaded) {
          cache.set(absoluteUrl, uploaded);
          uploadedImageCount++;
        }
      }

      const cached = cache.get(absoluteUrl);
      if (cached) replacedUrl = cached;
      processed++;
    }

    result += `${prefix}${replacedUrl}${suffix}`;
    lastIndex = matchIndex + full.length;
  }

  result += html.slice(lastIndex);
  return { content: result, uploadedImageCount };
}

// Function removed: copy content exactly as-is, no URL replacements

async function fetchPage(after: string, before: string, page: number): Promise<{ posts: WpPost[]; totalPages: number }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const url = new URL(WP_POSTS_ENDPOINT);
    url.searchParams.set('after', after);
    url.searchParams.set('before', before);
    url.searchParams.set('per_page', String(PER_PAGE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('orderby', 'date');
    url.searchParams.set('order', 'asc');
    url.searchParams.set('_embed', '1');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'StartupNews-Importer/1.0' },
      signal: AbortSignal.timeout(30000),
    });

    if (res.ok) {
      const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
      const posts = (await res.json()) as WpPost[];
      return { posts, totalPages };
    }

    const body = await res.text().catch(() => '');
    const retryable = res.status >= 500 || res.status === 429;
    if (!retryable || attempt === MAX_RETRIES) {
      throw new Error(`WP API failed page=${page} status=${res.status} body=${body.slice(0, 200)}`);
    }

    const delayMs = 1000 * attempt * 2;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('Unreachable fetchPage error');
}

async function main() {
  console.log(`Import source: ${SOURCE_BASE}`);
  console.log(`Date range: ${START_DATE} -> ${END_DATE}`);
  await getDbConnection();

  try {
    const admin = await queryOne<{ id: number; password_hash: string }>('SELECT id, password_hash FROM users WHERE role = ? ORDER BY id ASC LIMIT 1', ['admin']);
    if (!admin) throw new Error('No admin user found');

    const categoryMap = new Map<string, number>();
    for (const slug of SECTOR_SLUGS) {
      const row = await queryOne<{ id: number }>('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]);
      if (row?.id) categoryMap.set(slug, row.id);
    }
    if (categoryMap.size === 0) throw new Error('No categories loaded');

    const defaultCategoryId = categoryMap.get('tech') || categoryMap.get('ai-deeptech');
    if (!defaultCategoryId) throw new Error('No fallback category loaded');

    const importFeedId = await getOrCreateImportFeedId(defaultCategoryId, admin.id);

    let page = START_PAGE;
    let totalPages = START_PAGE;

    let imported = 0;
    let updated = 0;
    let duplicates = 0;
    let skippedWordCount = 0;
    let errors = 0;
    let contentImagesUploaded = 0;
    let featuredImagesUploaded = 0;
    let createdAuthors = 0;

    while (page <= totalPages && (END_PAGE <= 0 || page <= END_PAGE)) {
      let posts: WpPost[] = [];
      try {
        const fetched = await fetchPage(START_DATE, END_DATE, page);
        posts = fetched.posts;
        totalPages = fetched.totalPages;
        console.log(`Page ${page}/${totalPages}: ${posts.length} posts`);
      } catch (pageErr) {
        errors++;
        console.error(`Skipping failed page ${page}/${totalPages}:`, pageErr);
        page++;
        continue;
      }

      for (const post of posts) {
        try {
          const title = stripHtml(post.title?.rendered || '').slice(0, 255);
          const sourceSlug = (post.slug || slugify(title) || '').trim();
          const slug = sourceSlug.slice(0, 255);
          if (!title || !slug) {
            errors++;
            continue;
          }

          const excerptRaw = post.excerpt?.rendered || '';
          const contentRaw = post.content?.rendered || '';

          const excerpt = stripHtml(excerptRaw).slice(0, 500) || title;
          const metaDescription = excerpt.slice(0, 160);
          const originalContent = contentRaw || `<p>${excerpt}</p>`;

          const wordCount = getBodyWordCount(originalContent);
          if (wordCount < MIN_BODY_WORDS) {
            skippedWordCount++;
            continue;
          }

          const authorName = normalizeAuthorName(post._embedded?.author?.[0]?.name || DEFAULT_AUTHOR_NAME);
          const existingAuthor = await queryOne<{ id: number }>('SELECT id FROM users WHERE role = ? AND LOWER(name) = LOWER(?) LIMIT 1', ['author', authorName]);
          const authorId = await getOrCreateAuthorId(authorName, admin.password_hash);
          if (!existingAuthor) createdAuthors++;

          const rewrite = await rewriteImageAttributesToS3(originalContent, `wp-${post.id}`);
          const content = rewrite.content;
          contentImagesUploaded += rewrite.uploadedImageCount;

          let featuredImageUrl = extractFeaturedImage(post, content);
          if (featuredImageUrl && !isOurS3ImageUrl(featuredImageUrl)) {
            const featuredOnS3 = await downloadAndUploadFeaturedToS3(featuredImageUrl, `featured-${post.id}`);
            if (featuredOnS3) {
              featuredImageUrl = featuredOnS3;
              featuredImagesUploaded++;
            }
          }

          if (!featuredImageUrl || !isOurS3ImageUrl(featuredImageUrl)) {
            const contentImages = extractImageUrlsFromHtml(content, SOURCE_BASE);
            const bestContentImage = selectBestContentImageUrl(contentImages) || contentImages[0] || '';
            if (bestContentImage) featuredImageUrl = bestContentImage;
          }

          const existingItem = await queryOne<{ id: number; post_id: number | null }>(
            'SELECT id, post_id FROM rss_feed_items WHERE rss_feed_id = ? AND guid = ? LIMIT 1',
            [importFeedId, post.link]
          );

          const catSlug = categorySlug(title, excerpt, stripHtml(content));
          const categoryId = categoryMap.get(catSlug) || defaultCategoryId;

          const publishedAt = new Date(post.date);
          const publishedSql = Number.isNaN(publishedAt.getTime())
            ? new Date().toISOString().slice(0, 19).replace('T', ' ')
            : publishedAt.toISOString().slice(0, 19).replace('T', ' ');

          let postId: number | null = existingItem?.post_id ?? null;

          if (postId) {
            await query(
              `UPDATE posts SET
                title = ?, slug = ?, excerpt = ?, meta_description = ?, content = ?, category_id = ?, author_id = ?,
                featured_image_url = ?, featured_image_small_url = ?, format = ?, status = ?, featured = ?,
                published_at = ?, updated_at = NOW()
              WHERE id = ?`,
              [
                title,
                slug,
                excerpt,
                metaDescription,
                content,
                categoryId,
                authorId,
                featuredImageUrl,
                featuredImageUrl,
                'standard',
                'published',
                0,
                publishedSql,
                postId,
              ]
            );
            updated++;
          } else {
            const bySlug = await queryOne<{ id: number }>('SELECT id FROM posts WHERE slug = ? LIMIT 1', [slug]);
            if (bySlug?.id) {
              postId = bySlug.id;
              duplicates++;
            } else {
              await query(
                `INSERT INTO posts (
                  title, slug, excerpt, meta_description, content, category_id, author_id,
                  featured_image_url, featured_image_small_url, format, status, featured,
                  published_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                  title,
                  slug,
                  excerpt,
                  metaDescription,
                  content,
                  categoryId,
                  authorId,
                  featuredImageUrl,
                  featuredImageUrl,
                  'standard',
                  'published',
                  0,
                  publishedSql,
                ]
              );

              const createdPost = await queryOne<{ id: number }>('SELECT id FROM posts WHERE slug = ? LIMIT 1', [slug]);
              postId = createdPost?.id || null;
              if (!postId) throw new Error(`Failed to resolve inserted post id for slug=${slug}`);
              imported++;
            }
          }

          if (!postId) {
            errors++;
            continue;
          }

          const rssGuid = trimToMax(post.link || `${SOURCE_BASE}/post/${slug}`, 500);
          const rssLink = trimToMax(post.link || `${SOURCE_BASE}/post/${slug}`, 1000);
          const rssTitle = trimToMax(title, 500);
          const rssAuthor = trimToMax(authorName, 500);
          const rssDescription = trimToMaxBytes(excerpt, 65000);
          const rssContent = trimToMaxBytes(content, 65000);
          const rssImage = trimToMax(featuredImageUrl || '', 500);

          await query(
            `INSERT INTO rss_feed_items (
              rss_feed_id, guid, title, link, author, description, content,
              image_url, published_at, processed, post_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
              title = VALUES(title),
              link = VALUES(link),
              author = VALUES(author),
              description = VALUES(description),
              content = VALUES(content),
              image_url = VALUES(image_url),
              published_at = VALUES(published_at),
              processed = 1,
              post_id = VALUES(post_id),
              updated_at = NOW()`,
            [
              importFeedId,
              rssGuid,
              rssTitle,
              rssLink,
              rssAuthor,
              rssDescription,
              rssContent,
              rssImage,
              publishedSql,
              postId,
            ]
          );
        } catch (err) {
          errors++;
          console.error('Failed post:', post?.id, post?.link, err);
        }
      }

      page++;
    }

    console.log('Import completed');
    console.log(JSON.stringify({
      imported,
      updated,
      duplicates,
      skippedWordCount,
      contentImagesUploaded,
      featuredImagesUploaded,
      createdAuthors,
      errors,
      source: SOURCE_BASE,
      start: START_DATE,
      end: END_DATE,
      startPage: START_PAGE,
      endPage: END_PAGE > 0 ? END_PAGE : null,
      minBodyWords: MIN_BODY_WORDS,
    }, null, 2));
  } finally {
    await closeDbConnection();
  }
}

main().catch((err) => {
  console.error('Fatal import error', err);
  process.exit(1);
});
