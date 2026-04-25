/**
 * Backfill featured_image_url for posts that have none by fetching the live post URL
 * and extracting og:image (or first <img>). Use when posts were synced without images.
 *
 * Requires: .env.local with DB_*, and POST_SOURCE_BASE_URL (default https://startupnews.thebackend.in)
 * Post URL pattern: {POST_SOURCE_BASE_URL}/post/{slug}
 *
 * Usage: npx tsx scripts/backfill-post-images-from-live-url.ts [--dry-run] [--limit N]
 */

import mariadb from 'mariadb';
import { loadEnvConfig } from '@next/env';

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

function extractFirstImgSrc(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m && m[1]) return m[1].trim();
  return null;
}

async function fetchUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StartupNews-Backfill/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Try multiple URL patterns (e.g. /post/slug and WordPress /slug/) */
async function fetchPostHtml(slug: string): Promise<string | null> {
  const encoded = encodeURIComponent(slug);
  const urls = [
    `${POST_SOURCE_BASE}/post/${encoded}`,
    `${POST_SOURCE_BASE}/${encoded}`,
    `${POST_SOURCE_BASE}/${encoded}/`,
  ];
  for (const url of urls) {
    const html = await fetchUrl(url);
    if (html) return html;
  }
  return null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 && process.argv[limitIdx + 1] ? parseInt(process.argv[limitIdx + 1], 10) : 0;

  let pool: mariadb.Pool | null = null;
  try {
    pool = mariadb.createPool({ ...ZOX, connectionLimit: 2 });
    const conn = await pool.getConnection();

    const rows = (await conn.query(
      `SELECT id, slug, title FROM posts
       WHERE (featured_image_url IS NULL OR featured_image_url = '')
       AND slug IS NOT NULL AND slug != ''
       ORDER BY id ASC
       ${limit > 0 ? `LIMIT ${limit}` : ''}`
    )) as Array<{ id: number; slug: string; title: string }>;

    if (!rows.length) {
      console.log('\nNo posts without featured image found.\n');
      conn.release();
      return;
    }

    console.log(`\nBackfill featured image from live URL (${POST_SOURCE_BASE}/post/{slug})\n`);
    console.log(`Posts to process: ${rows.length}${dryRun ? ' (dry run)' : ''}\n`);

    let updated = 0;
    let failed = 0;

    for (const row of rows) {
      const html = await fetchPostHtml(row.slug);
      const ogImage = html ? extractOgImage(html) : null;
      const firstImg = !ogImage && html ? extractFirstImgSrc(html) : null;
      const imageUrl = ogImage || firstImg;

      if (imageUrl) {
        const urlTrunc = imageUrl.length > 500 ? imageUrl.slice(0, 500) : imageUrl;
        if (!dryRun) {
          await conn.query(
            'UPDATE posts SET featured_image_url = ?, featured_image_small_url = ? WHERE id = ?',
            [urlTrunc, urlTrunc, row.id]
          );
        }
        updated++;
        if (updated <= 10) console.log(`   ${row.slug.slice(0, 50)}... → image`);
      } else {
        failed++;
        if (failed <= 5) console.log(`   ${row.slug.slice(0, 50)}... → no image found`);
      }
    }

    console.log(`\n   Updated: ${updated}${dryRun ? ' (dry run)' : ''}`);
    console.log(`   No image found: ${failed}\n`);
    conn.release();
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

main();
