/**
 * Fast Image Backfill: Fetch og:image from live source URLs
 * - Parallel fetches (10 concurrent)
 * - Extract og:image or first img src
 * - Store in featured_image_url (no re-upload)
 * 
 * Usage: npx tsx scripts/fast-backfill-images-from-live.ts [--limit N]
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

const POST_SOURCE_BASE = (process.env.POST_SOURCE_BASE_URL || process.env.WP_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');

function extractOgImage(html: string): string | null {
  const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (m && m[1]) return m[1].trim();
  return null;
}

function extractFirstImg(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m && m[1]) return m[1].trim();
  return null;
}

async function fetchPostImage(slug: string): Promise<string | null> {
  const postUrl = `${POST_SOURCE_BASE}/post/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(postUrl, {
      headers: { 'User-Agent': 'CurlBot/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractOgImage(html) || extractFirstImg(html);
  } catch {
    return null;
  }
}

async function processInParallel(
  rows: Array<{ id: number; slug: string }>,
  concurrency: number
): Promise<Map<number, string>> {
  const results = new Map<number, string>();
  for (let i = 0; i < rows.length; i += concurrency) {
    const batch = rows.slice(i, i + concurrency);
    const promises = batch.map(async (row) => {
      const imageUrl = await fetchPostImage(row.slug);
      return { id: row.id, imageUrl };
    });
    const batchResults = await Promise.all(promises);
    for (const { id, imageUrl } of batchResults) {
      if (imageUrl) {
        results.set(id, imageUrl);
      }
    }
  }
  return results;
}

async function main() {
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 && process.argv[limitIdx + 1] ? parseInt(process.argv[limitIdx + 1], 10) : 0;

  let pool: mariadb.Pool | null = null;

  try {
    pool = mariadb.createPool({ ...ZOX, connectionLimit: 4 });
    const conn = await pool.getConnection();

    console.log('\n📷 Fast image backfill from live source URLs\n');
    console.log(`   Source: ${POST_SOURCE_BASE}/post/{slug}`);
    console.log(`   Concurrency: 10 parallel fetches\n`);

    // Get posts with no featured image
    let sql = `SELECT id, slug FROM posts 
      WHERE (featured_image_url IS NULL OR featured_image_url = '')
      AND slug IS NOT NULL AND slug != ''
      ORDER BY id DESC`;
    if (limit > 0) sql += ` LIMIT ${limit}`;

    const rows = (await conn.query(sql)) as Array<{ id: number; slug: string }>;

    if (!rows.length) {
      console.log('   ✅ All posts have featured images.\n');
      conn.release();
      return;
    }

    console.log(`   Posts to backfill: ${rows.length}\n`);

    // Fetch images in parallel
    const imageMap = await processInParallel(rows, 10);

    console.log(`   Found images: ${imageMap.size} / ${rows.length}\n`);

    // Update DB
    let updated = 0;
    for (const [postId, imageUrl] of imageMap) {
      const urlTrunc = imageUrl.slice(0, 500);
      await conn.query(
        'UPDATE posts SET featured_image_url = ?, featured_image_small_url = ? WHERE id = ?',
        [urlTrunc, urlTrunc, postId]
      );
      updated++;

      if (updated % 1000 === 0) {
        console.log(`   Updated: ${updated}/${imageMap.size}...`);
      }
    }

    console.log(`\n   ✅ Backfilled: ${updated} posts\n`);
    conn.release();
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

main();
