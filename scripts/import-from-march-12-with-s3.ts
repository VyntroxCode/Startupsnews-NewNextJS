import { loadEnvConfig } from '@next/env';
import { getDbConnection, closeDbConnection, query, queryOne } from '../src/shared/database/connection';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

loadEnvConfig(process.cwd());

const SOURCE_BASE = 'https://startupnews.thebackend.in';
const WP_POSTS_ENDPOINT = `${SOURCE_BASE}/wp-json/wp/v2/posts`;
const START_DATE = '2026-03-12T00:00:00Z'; // March 12 onwards
const END_DATE = new Date().toISOString();
const PER_PAGE = 50;
const START_PAGE = 1;
const MAX_RETRIES = 4;
const CONTENT_IMAGE_LIMIT = 8;

// S3 Configuration
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'startupnews-media-2026';
const S3_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_PREFIX = 'startupnews-in/imports/from-backend';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const SECTOR_SLUGS = [
  'ai-deeptech',
  'fintech',
  'social-media',
  'robotics',
  'health-tech',
  'mobility',
  'ecommerce',
  'saas-enterprise',
  'consumer-d2c',
  'web3-blockchain',
  'cybersecurity',
  'climate-energy',
];

const KEYWORDS: Record<string, string[]> = {
  'ai-deeptech': ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'deep tech', 'deeptech'],
  fintech: ['fintech', 'finance', 'payments', 'bank', 'lending', 'insurance', 'crypto'],
  'social-media': ['social', 'creator', 'influencer', 'instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'],
  robotics: ['robot', 'robotics', 'automation', 'drone', 'autonomous'],
  'health-tech': ['health', 'healthcare', 'medical', 'biotech', 'pharma', 'wellness', 'telemedicine'],
  mobility: ['ev', 'electric vehicle', 'mobility', 'transport', 'battery', 'charging'],
  ecommerce: ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'shopping', 'delivery'],
  'saas-enterprise': ['saas', 'enterprise', 'b2b', 'software', 'cloud', 'api', 'platform'],
  'consumer-d2c': ['d2c', 'direct-to-consumer', 'consumer', 'brand'],
  'web3-blockchain': ['web3', 'blockchain', 'nft', 'defi', 'crypto', 'token'],
  cybersecurity: ['cybersecurity', 'security', 'breach', 'threat', 'encryption', 'privacy'],
  'climate-energy': ['climate', 'energy', 'renewable', 'solar', 'wind', 'sustainability', 'carbon'],
};

type WpRendered = { rendered?: string };
type WpFeaturedMedia = { source_url?: string };
type WpEmbedded = { 'wp:featuredmedia'?: WpFeaturedMedia[] };
type WpPost = {
  id: number;
  date: string;
  slug: string;
  link: string;
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

function extractImageUrlsFromHtml(html: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const imgRegex = /src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('data:')) {
      urls.push(url);
    }
  }
  return urls;
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
  if (embedded) return embedded;

  const fromContent = extractImageUrlsFromHtml(contentHtml || '');
  if (fromContent.length > 0) return fromContent[0];

  return '';
}

async function uploadImageToS3(imageUrl: string, filename: string): Promise<string | null> {
  try {
    // Skip if already S3 URL
    if (imageUrl.includes('s3') || imageUrl.includes('amazonaws')) {
      return imageUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'StartupNews-Importer/1.0' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch image: ${imageUrl} (${response.status})`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `${S3_PREFIX}/${filename}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: response.headers.get('content-type') || 'image/jpeg',
      })
    );

    const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
    console.log(`✓ Uploaded: ${filename} → ${s3Url.slice(0, 80)}...`);
    return s3Url;
  } catch (err: any) {
    console.warn(`Failed to upload image: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

async function downloadAndUploadImages(post: WpPost, contentHtml: string): Promise<{ featured: string | null; all: string[] }> {
  const imageUrls = extractImageUrlsFromHtml(contentHtml);
  const uploadedUrls: string[] = [];
  let featuredUrl: string | null = null;

  // Featured image
  const featuredImageUrl = extractFeaturedImage(post, contentHtml);
  if (featuredImageUrl) {
    const filename = `featured-${post.id}-${Date.now()}.jpg`;
    const s3Url = await uploadImageToS3(featuredImageUrl, filename);
    if (s3Url) {
      featuredUrl = s3Url;
    }
  }

  // Content images (limit to 8)
  for (let i = 0; i < Math.min(imageUrls.length, CONTENT_IMAGE_LIMIT); i++) {
    const url = imageUrls[i];
    const filename = `content-${post.id}-${i}-${Date.now()}.jpg`;
    const s3Url = await uploadImageToS3(url, filename);
    if (s3Url) {
      uploadedUrls.push(s3Url);
    }
  }

  return { featured: featuredUrl || null, all: uploadedUrls };
}

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

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { 'User-Agent': 'StartupNews-Importer/1.0' },
      });

      clearTimeout(timeoutId);

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
    } catch (err: any) {
      if (attempt === MAX_RETRIES) throw err;
      const delayMs = 1000 * attempt * 2;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error('Unreachable fetchPage error');
}

async function main() {
  console.log(`Import source: ${SOURCE_BASE}`);
  console.log(`Date range: ${START_DATE} -> ${END_DATE}`);
  console.log(`S3 bucket: ${S3_BUCKET}`);
  await getDbConnection();

  try {
    const admin = await queryOne<{ id: number }>('SELECT id FROM users WHERE role = ? ORDER BY id ASC LIMIT 1', ['admin']);
    if (!admin) throw new Error('No admin user found');

    const categoryMap = new Map<string, number>();
    for (const slug of SECTOR_SLUGS) {
      const row = await queryOne<{ id: number }>('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]);
      if (row?.id) categoryMap.set(slug, row.id);
    }
    if (categoryMap.size === 0) throw new Error('No categories loaded');

    let page = START_PAGE;
    let totalPages = START_PAGE;
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    while (page <= totalPages) {
      const { posts, totalPages: tp } = await fetchPage(START_DATE, END_DATE, page);
      totalPages = tp;
      console.log(`\n📄 Page ${page}/${totalPages}: fetched ${posts.length} posts`);

      for (const post of posts) {
        try {
          const title = stripHtml(post.title?.rendered || '').slice(0, 255);
          const slug = (post.slug || '').trim().slice(0, 255);
          if (!title || !slug) {
            errors++;
            continue;
          }

          const exists = await queryOne<{ id: number }>('SELECT id FROM posts WHERE slug = ? OR title = ? LIMIT 1', [slug, title]);
          if (exists) {
            duplicates++;
            continue;
          }

          const excerptRaw = post.excerpt?.rendered || '';
          const contentRaw = post.content?.rendered || '';
          const excerpt = stripHtml(excerptRaw).slice(0, 500) || title;
          const metaDescription = excerpt.slice(0, 160);
          const content = contentRaw || `<p>${excerpt}</p>`;

          // Download and upload images to S3
          console.log(`  ⬜ Downloading images for: ${title.slice(0, 50)}...`);
          const { featured: s3FeaturedUrl } = await downloadAndUploadImages(post, content);

          const catSlug = categorySlug(title, excerpt, stripHtml(content));
          const categoryId = categoryMap.get(catSlug) || categoryMap.get('ai-deeptech') || null;

          const publishedAt = new Date(post.date);
          const publishedSql = Number.isNaN(publishedAt.getTime())
            ? new Date().toISOString().slice(0, 19).replace('T', ' ')
            : publishedAt.toISOString().slice(0, 19).replace('T', ' ');

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
              admin.id,
              s3FeaturedUrl || null,
              s3FeaturedUrl || null,
              'standard',
              'published',
              0,
              publishedSql,
            ]
          );

          imported++;
          console.log(`  ✅ Imported: ${title.slice(0, 50)}...`);
        } catch (err) {
          errors++;
          console.error(`  ❌ Failed: ${post?.id} - ${err}`);
        }
      }

      page++;
    }

    console.log('\n========================================');
    console.log('Import completed');
    console.log(JSON.stringify(
      {
        imported,
        duplicates,
        errors,
        source: SOURCE_BASE,
        start: START_DATE,
        end: END_DATE,
        s3_bucket: S3_BUCKET,
        s3_prefix: S3_PREFIX,
      },
      null,
      2
    ));
    console.log('========================================');
  } finally {
    await closeDbConnection();
  }
}

main().catch((err) => {
  console.error('Fatal import error', err);
  process.exit(1);
});
