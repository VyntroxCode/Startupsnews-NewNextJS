import { loadEnvConfig } from '@next/env';
import { getDbConnection, closeDbConnection, query, queryOne } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const SOURCE_BASE = 'https://startupnews.fyi';
const WP_POSTS_ENDPOINT = `${SOURCE_BASE}/wp-json/wp/v2/posts`;
const START_DATE = process.env.IMPORT_FROM_DATE || '2026-03-01T00:00:00';
const END_DATE = process.env.IMPORT_TO_DATE || new Date().toISOString();
const PER_PAGE = Number(process.env.IMPORT_PER_PAGE || '100');
const START_PAGE = Number(process.env.IMPORT_START_PAGE || '1');
const MAX_PAGE_RETRIES = Number(process.env.IMPORT_PAGE_RETRIES || '5');
const IMPORT_ORDER = process.env.IMPORT_ORDER === 'desc' ? 'desc' : 'asc';

const SECTOR_SLUGS = [
  'ai-deeptech',
  'fintech',
  'social-media',
  'robotics',
  'healthtech',
  'ev-mobility',
  'ecommerce',
  'saas-enterprise',
  'consumer-d2c',
  'web3-blockchain',
  'cybersecurity',
  'climate-energy',
];

const KEYWORDS: Record<string, string[]> = {
  'ai-deeptech': ['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'deep tech', 'deeptech'],
  'fintech': ['fintech', 'finance', 'payments', 'bank', 'lending', 'insurance', 'crypto'],
  'social-media': ['social', 'creator', 'influencer', 'instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'],
  robotics: ['robot', 'robotics', 'automation', 'drone', 'autonomous'],
  healthtech: ['health', 'healthcare', 'medical', 'biotech', 'pharma', 'wellness', 'telemedicine'],
  'ev-mobility': ['ev', 'electric vehicle', 'mobility', 'transport', 'battery', 'charging'],
  ecommerce: ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'shopping', 'delivery'],
  'saas-enterprise': ['saas', 'enterprise', 'b2b', 'software', 'cloud', 'api', 'platform'],
  'consumer-d2c': ['d2c', 'direct-to-consumer', 'consumer', 'brand'],
  'web3-blockchain': ['web3', 'blockchain', 'nft', 'defi', 'crypto', 'token'],
  cybersecurity: ['cybersecurity', 'security', 'breach', 'threat', 'encryption', 'privacy'],
  'climate-energy': ['climate', 'energy', 'renewable', 'solar', 'wind', 'sustainability', 'carbon'],
};

type WpPost = {
  id: number;
  date: string;
  slug: string;
  link: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
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

function getCategorySlug(title: string, excerpt: string, content: string): string {
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

async function fetchPage(page: number): Promise<{ posts: WpPost[]; totalPages: number }> {
  for (let attempt = 1; attempt <= MAX_PAGE_RETRIES; attempt++) {
    const url = new URL(WP_POSTS_ENDPOINT);
    url.searchParams.set('after', START_DATE);
    url.searchParams.set('before', END_DATE);
    url.searchParams.set('per_page', String(PER_PAGE));
    url.searchParams.set('page', String(page));
    url.searchParams.set('orderby', 'date');
    url.searchParams.set('order', IMPORT_ORDER);
    url.searchParams.set('_fields', 'id,date,slug,link,title,excerpt,content');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
    });

    if (res.ok) {
      const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
      const posts = (await res.json()) as WpPost[];
      return { posts, totalPages };
    }

    const body = await res.text().catch(() => '');
    const transient = res.status >= 500 || res.status === 429;
    if (!transient || attempt === MAX_PAGE_RETRIES) {
      throw new Error(`WP API failed page=${page} attempt=${attempt} status=${res.status} body=${body.slice(0, 200)}`);
    }

    const delayMs = 1000 * attempt * 2;
    console.warn(`Retrying page ${page} after ${delayMs}ms (attempt ${attempt}/${MAX_PAGE_RETRIES})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`WP API failed page=${page} after retries`);
}

async function main() {
  console.log(`Starting import from ${START_DATE} to ${END_DATE} (order=${IMPORT_ORDER})`);
  await getDbConnection();

  try {
    const admin = await queryOne<{ id: number }>('SELECT id FROM users WHERE role = ? ORDER BY id ASC LIMIT 1', ['admin']);
    if (!admin) throw new Error('No admin user found');

    const categoryMap = new Map<string, number>();
    for (const slug of SECTOR_SLUGS) {
      const row = await queryOne<{ id: number }>('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]);
      if (row?.id) categoryMap.set(slug, row.id);
    }
    if (categoryMap.size === 0) throw new Error('No category IDs loaded');

    let page = START_PAGE;
    let totalPages = START_PAGE;
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    while (page <= totalPages) {
      const { posts, totalPages: tp } = await fetchPage(page);
      totalPages = tp;
      console.log(`Page ${page}/${totalPages}: ${posts.length} posts`);

      for (const post of posts) {
        try {
          const title = stripHtml(post.title?.rendered || '').slice(0, 255);
          const slug = (post.slug || '').trim().slice(0, 255);
          if (!title || !slug) {
            errors++;
            continue;
          }

          const exists = await queryOne<{ id: number }>(
            'SELECT id FROM posts WHERE slug = ? OR title = ? LIMIT 1',
            [slug, title]
          );
          if (exists) {
            duplicates++;
            continue;
          }

          const excerptRaw = post.excerpt?.rendered || '';
          const contentRaw = post.content?.rendered || '';
          const excerpt = stripHtml(excerptRaw).slice(0, 500) || title;
          const content = contentRaw || `<p>${excerpt}</p>`;
          const metaDescription = excerpt.slice(0, 160);
          const categorySlug = getCategorySlug(title, excerpt, stripHtml(content));
          const categoryId = categoryMap.get(categorySlug) || categoryMap.get('ai-deeptech') || null;
          const imageUrl = null;
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
              imageUrl,
              imageUrl,
              'standard',
              'published',
              0,
              publishedSql,
            ]
          );

          imported++;
        } catch (err) {
          errors++;
          console.error('Failed post:', post?.link || post?.id, err);
        }
      }

      page++;
    }

    console.log('Import completed');
    console.log(JSON.stringify({ imported, duplicates, errors }, null, 2));
  } finally {
    await closeDbConnection();
  }
}

main().catch((err) => {
  console.error('Fatal import error', err);
  process.exit(1);
});
