/**
 * Fast Import: Copy all WP posts to zox_db
 * - No per-image S3 upload (too slow)
 * - Preserve published_at timestamp
 * - Auto-map to 12-13 categories by keywords
 * - Batch insert for speed
 * 
 * Usage: npx tsx scripts/fast-sync-all-posts.ts
 */

import { loadEnvConfig } from '@next/env';
import mariadb from 'mariadb';

loadEnvConfig(process.cwd());

const ZOX = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'zox_db',
};

const WP = {
  host: process.env.WP_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.WP_DB_PORT || process.env.DB_PORT || '3306', 10),
  user: process.env.WP_DB_USER || process.env.DB_USER,
  password: process.env.WP_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.WP_DB_NAME || 'wp_startupnews',
};

const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'wp_';
const WP_SITE_URL = (process.env.WP_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');

// 12-13 sectors available in zox
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

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'ai-deeptech': ['ai', 'artificial intelligence', 'deep tech', 'deeptech', 'machine learning', 'neural', 'llm', 'transformer', 'algorithm'],
  'fintech': ['fintech', 'finance', 'bank', 'payment', 'lending', 'insurance', 'trading', 'investment', 'wealth', 'crypto', 'bitcoin'],
  'social-media': ['social', 'twitter', 'facebook', 'instagram', 'tiktok', 'linkedin', 'creator', 'influencer', 'community'],
  'robotics': ['robot', 'automation', 'drone', 'hardware', 'manufacturing', 'assembly', 'robotic', 'autonomous'],
  'healthtech': ['health', 'medical', 'pharma', 'biotech', 'wellness', 'fitness', 'doctor', 'hospital', 'vaccine', 'telemedicine'],
  'ev-mobility': ['electric', 'ev', 'vehicle', 'auto', 'car', 'transport', 'battery', 'charging', 'mobility'],
  'ecommerce': ['ecommerce', 'retail', 'shopping', 'marketplace', 'store', 'seller', 'vendor', 'logistics', 'delivery'],
  'saas-enterprise': ['saas', 'enterprise', 'software', 'b2b', 'erp', 'crm', 'cloud', 'api', 'devops', 'platform'],
  'consumer-d2c': ['d2c', 'direct-to-consumer', 'consumer', 'brand', 'fmcg', 'fashion', 'food', 'beverage'],
  'web3-blockchain': ['web3', 'blockchain', 'nft', 'defi', 'smart contract', 'ethereum', 'dapp', 'metaverse', 'web 3'],
  'cybersecurity': ['security', 'cybersecurity', 'hack', 'encryption', 'privacy', 'breach', 'vulnerability', 'threat'],
  'climate-energy': ['climate', 'energy', 'green', 'renewable', 'solar', 'wind', 'carbon', 'sustainability', 'environment'],
};

function trim(s: unknown): string {
  if (s == null) return '';
  return String(s).trim();
}

function categorizePost(title: string, excerpt: string, content: string): string {
  const text = `${title} ${excerpt} ${content}`.toLowerCase();
  const scores = new Map<string, number>();

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const matches = (text.match(new RegExp(`\\b${kw}\\b`, 'gi')) || []).length;
      score += matches * kw.length;
    }
    scores.set(slug, score);
  }

  let best = 'ai-deeptech';
  let bestScore = 0;
  for (const [slug, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = slug;
    }
  }
  return best;
}

async function main() {
  let wpPool: mariadb.Pool | null = null;
  let zoxPool: mariadb.Pool | null = null;

  try {
    wpPool = mariadb.createPool({ ...WP, connectionLimit: 3 });
    zoxPool = mariadb.createPool({ ...ZOX, connectionLimit: 3 });

    const wpConn = await wpPool.getConnection();
    const zoxConn = await zoxPool.getConnection();

    console.log('\n📥 Fast sync all WP posts to zox_db\n');
    console.log(`   Source: ${WP.database}@${WP.host}`);
    console.log(`   Target: ${ZOX.database}\n`);

    // Clear
    console.log('   Clearing posts...');
    await zoxConn.query('DELETE FROM post_tags');
    await zoxConn.query('DELETE FROM posts');
    console.log('   ✅ Cleared.\n');

    // Get categories
    const cats = (await zoxConn.query('SELECT id, slug FROM categories')) as Array<{ id: number; slug: string }>;
    const catMap = new Map<string, number>();
    for (const c of cats) {
      catMap.set(c.slug.toLowerCase(), c.id);
    }

    // Get admin
    const adminRows = (await zoxConn.query('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin'])) as Array<{ id: number }>;
    const authorId = adminRows?.[0]?.id || 1;

    // Fetch all WP posts (with featured image URL if available)
    const prefix = TABLE_PREFIX;
    const wpPosts = (await wpConn.query(
      `SELECT p.ID, p.post_title, p.post_name, p.post_excerpt, p.post_content, p.post_date, a.guid AS featured_image_url
       FROM ${prefix}posts p
       LEFT JOIN ${prefix}postmeta pm ON pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id'
       LEFT JOIN ${prefix}posts a ON a.ID = pm.meta_value AND a.post_type = 'attachment'
       WHERE p.post_type = 'post' AND p.post_status = 'publish'
       ORDER BY p.post_date DESC`
    )) as Array<{
      ID: number;
      post_title: string;
      post_name: string;
      post_excerpt: string;
      post_content: string;
      post_date: Date | string;
      featured_image_url: string | null;
    }>;

    if (!wpPosts.length) {
      console.log('   No posts found.\n');
      wpConn.release();
      zoxConn.release();
      return;
    }

    console.log(`   Found ${wpPosts.length} posts.\n`);

    // Dedupe by slug
    const seen = new Set<string>();
    const toInsert: any[] = [];
    let skipped = 0;

    for (const row of wpPosts) {
      const slug = trim(row.post_name);
      if (!slug || seen.has(slug)) {
        skipped++;
        continue;
      }
      seen.add(slug);

      const title = trim(row.post_title) || 'Untitled';
      const excerpt = trim(row.post_excerpt).slice(0, 500) || title.slice(0, 200);
      const content = trim(row.post_content) || `<p>${excerpt}</p>`;
      const pubDate = row.post_date ? new Date(row.post_date) : new Date();
      const imageUrl = trim(row.featured_image_url) || null;

      const categorySlug = categorizePost(title, excerpt, content).toLowerCase();
      const categoryId = catMap.get(categorySlug) || catMap.get('ai-deeptech') || 1;

      toInsert.push([
        title.slice(0, 255),
        slug.slice(0, 255),
        excerpt.slice(0, 500),
        excerpt.slice(0, 160),
        content,
        categoryId,
        authorId,
        imageUrl ? imageUrl.slice(0, 500) : null,
        imageUrl ? imageUrl.slice(0, 500) : null,
        'standard',
        'published',
        0,
        pubDate.toISOString().slice(0, 19).replace('T', ' '),
        0,
        0,
      ]);
    }

    console.log(`   Total to insert: ${toInsert.length} (skipped duplicates: ${skipped})\n`);

    // Batch insert
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize);
      const sql = `INSERT INTO posts (
        title, slug, excerpt, meta_description, content, category_id, author_id,
        featured_image_url, featured_image_small_url, format, status, featured,
        published_at, trending_score, view_count
      ) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`;

      const params = batch.flat();
      await zoxConn.query(sql, params);
      inserted += batch.length;

      const prog = Math.min(i + batchSize, toInsert.length);
      console.log(`   Inserted: ${prog}/${toInsert.length}...`);
    }

    console.log(`\n   ✅ Inserted: ${inserted} posts`);
    console.log(`   📅 Published dates preserved from source`);
    console.log(`   🏷️  Categories auto-mapped to 12 sectors\n`);

    wpConn.release();
    zoxConn.release();
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  } finally {
    if (wpPool) await wpPool.end();
    if (zoxPool) await zoxPool.end();
  }
}

main();
