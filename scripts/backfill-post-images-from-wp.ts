/**
 * Backfill featured_image_url in zox_db from WordPress (old) DB.
 * Use when posts in zox have no image but WP had featured images (e.g. via Advanced Media Offloader to S3).
 *
 * For each zox post with empty featured_image_url:
 * - Find WP post by slug
 * - Get featured image from _thumbnail_id -> attachment
 * - Image URL from: (1) attachment guid if already S3, (2) else convert local guid to S3 path,
 *   (3) else _wp_attached_file path + S3 base, (4) else first <img src> in post_content
 * - Update zox post
 *
 * Requires: .env.local with DB_*, WP_DB_*, S3_IMAGE_BASE_URL or NEXT_PUBLIC_IMAGE_BASE_URL
 * Usage: npx tsx scripts/backfill-post-images-from-wp.ts [--dry-run] [--limit N]
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

const WP = {
  host: process.env.WP_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.WP_DB_PORT || process.env.DB_PORT || '3306', 10),
  user: process.env.WP_DB_USER || process.env.DB_USER,
  password: process.env.WP_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.WP_DB_NAME || 'wp_startupnews',
};

const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'wp_';
const S3_BASE = (process.env.S3_IMAGE_BASE_URL || process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '').replace(/\/$/, '');

function trim(s: unknown): string {
  if (s == null) return '';
  const t = typeof s === 'string' ? s : Buffer.isBuffer(s) ? s.toString('utf8') : String(s);
  return t.trim();
}

/** Strip S3 presigned query params */
function stripPresigned(url: string): string {
  const q = url.indexOf('?');
  if (q === -1) return url;
  if (/X-Amz-Algorithm|x-amz-algorithm/i.test(url.slice(q + 1))) return url.slice(0, q);
  return url;
}

/**
 * Resolve image URL from WP attachment (guid or _wp_attached_file) to a single URL we can store.
 * - If guid is already S3, use it (strip presigned).
 * - If guid is local (e.g. startupnews.thebackend.in or wp-content), build S3 URL from path.
 * - Else use _wp_attached_file path with S3 base (e.g. 2024/01/photo.jpg -> S3_BASE/2024/01/photo.jpg or S3_BASE/uploads/...).
 */
function resolveImageUrl(guid: string, attachedFile: string): string | null {
  const g = trim(guid);
  const af = trim(attachedFile);

  if (g && (g.includes('amazonaws.com') || g.includes('s3.') || /^https?:\/\/[^/]*s3[^/]*\./.test(g))) {
    return stripPresigned(g);
  }
  if (g && (g.includes('wp-content') || g.includes('uploads') || g.includes('thebackend.in'))) {
    try {
      const u = new URL(g);
      const path = u.pathname.startsWith('/') ? u.pathname : '/' + u.pathname;
      if (S3_BASE) return S3_BASE + path;
      return null;
    } catch {
      const pathMatch = g.match(/\/wp-content\/uploads\/(.+)$/) || g.match(/\/(uploads\/.+)$/);
      if (pathMatch && S3_BASE) return S3_BASE + '/' + (pathMatch[1] || pathMatch[0].replace(/^\//, ''));
      return null;
    }
  }
  if (g && (g.startsWith('http://') || g.startsWith('https://'))) {
    return stripPresigned(g);
  }
  if (af && S3_BASE) {
    const path = af.startsWith('/') ? af : '/' + af;
    return S3_BASE + path;
  }
  return null;
}

/** Extract first img src from HTML content */
function firstImgSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match) return null;
  const src = trim(match[1]);
  if (!src) return null;
  if (src.includes('amazonaws.com') || src.includes('s3.')) return stripPresigned(src);
  if (src.includes('wp-content') || src.includes('uploads') && S3_BASE) {
    try {
      const u = new URL(src, 'https://dummy');
      const path = u.pathname.startsWith('/') ? u.pathname : '/' + u.pathname;
      return S3_BASE + path;
    } catch {
      const pathMatch = src.match(/\/wp-content\/uploads\/(.+)$/) || src.match(/\/(uploads\/.+)$/);
      if (pathMatch && S3_BASE) return S3_BASE + '/' + (pathMatch[1] || pathMatch[0].replace(/^\//, ''));
    }
  }
  return src.startsWith('http') ? stripPresigned(src) : null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 && process.argv[limitIdx + 1] ? parseInt(process.argv[limitIdx + 1], 10) : 0;

  if (!S3_BASE) {
    console.error('\n❌ Set S3_IMAGE_BASE_URL or NEXT_PUBLIC_IMAGE_BASE_URL in .env.local\n');
    process.exit(1);
  }

  let wpPool: mariadb.Pool | null = null;
  let zoxPool: mariadb.Pool | null = null;

  try {
    wpPool = mariadb.createPool({ ...WP, connectionLimit: 2 });
    zoxPool = mariadb.createPool({ ...ZOX, connectionLimit: 2 });

    const wpConn = await wpPool.getConnection();
    const zoxConn = await zoxPool.getConnection();

    const prefix = TABLE_PREFIX;

    // Zox posts with empty featured_image_url (batch by slug for matching)
    let sqlZox = `
      SELECT id, slug, title FROM posts
      WHERE (featured_image_url IS NULL OR TRIM(COALESCE(featured_image_url, '')) = '')
      AND status = 'published'
      ORDER BY id DESC
    `;
    if (limit > 0) sqlZox += ` LIMIT ${Math.max(1, limit)}`;
    const zoxRows = (await zoxConn.query(sqlZox)) as Array<{ id: number; slug: string; title: string }>;

    if (zoxRows.length === 0) {
      console.log('\n   No zox posts with empty featured_image_url.\n');
      wpConn.release();
      zoxConn.release();
      return;
    }

    console.log('\n📷 Backfill post images from WordPress DB\n');
    console.log(`   S3 base: ${S3_BASE}`);
    console.log(`   Zox posts to try: ${zoxRows.length} ${dryRun ? '(dry run)' : ''}\n`);

    let updated = 0;
    let noWpPost = 0;
    let noImage = 0;

    for (const row of zoxRows) {
      const slug = trim(row.slug);
      if (!slug) continue;

      // WP post by slug (post_name), then by title if no slug match
      let wpPosts = (await wpConn.query(
        `SELECT ID, post_content FROM ${prefix}posts WHERE post_type = 'post' AND post_name = ? AND post_status IN ('publish', 'draft') LIMIT 1`,
        [slug]
      )) as Array<{ ID: number; post_content: string | null }>;
      if (!wpPosts || wpPosts.length === 0) {
        const zoxTitle = trim(row.title);
        if (zoxTitle) {
          wpPosts = (await wpConn.query(
            `SELECT ID, post_content FROM ${prefix}posts WHERE post_type = 'post' AND post_title = ? AND post_status IN ('publish', 'draft') LIMIT 1`,
            [zoxTitle]
          )) as Array<{ ID: number; post_content: string | null }>;
        }
      }
      if (!wpPosts || wpPosts.length === 0) {
        noWpPost++;
        continue;
      }

      const wpPostId = wpPosts[0].ID;
      const postContent = wpPosts[0].post_content || '';

      // Thumbnail attachment: _thumbnail_id -> attachment post
      const thumbMeta = (await wpConn.query(
        `SELECT meta_value FROM ${prefix}postmeta WHERE post_id = ? AND meta_key = '_thumbnail_id' LIMIT 1`,
        [wpPostId]
      )) as Array<{ meta_value: string }>;
      const attachmentId = thumbMeta?.[0]?.meta_value ? parseInt(thumbMeta[0].meta_value, 10) : 0;

      let imageUrl: string | null = null;

      if (attachmentId) {
        const att = (await wpConn.query(
          `SELECT guid FROM ${prefix}posts WHERE ID = ? AND post_type = 'attachment' LIMIT 1`,
          [attachmentId]
        )) as Array<{ guid: string }>;
        const attachedFileMeta = (await wpConn.query(
          `SELECT meta_value FROM ${prefix}postmeta WHERE post_id = ? AND meta_key = '_wp_attached_file' LIMIT 1`,
          [attachmentId]
        )) as Array<{ meta_value: string }>;
        const guid = att?.[0]?.guid ?? '';
        const attachedFile = attachedFileMeta?.[0]?.meta_value ?? '';
        imageUrl = resolveImageUrl(guid, attachedFile);
        // Advanced Media Offloader / other plugins may store S3 URL in attachment meta
        if (!imageUrl) {
          const urlMeta = (await wpConn.query(
            `SELECT meta_key, meta_value FROM ${prefix}postmeta WHERE post_id = ? AND (meta_value LIKE 'http://%' OR meta_value LIKE 'https://%') LIMIT 5`,
            [attachmentId]
          )) as Array<{ meta_key: string; meta_value: string }>;
          for (const m of urlMeta || []) {
            const v = trim(m.meta_value);
            if (v && (v.includes('amazonaws.com') || v.includes('s3.') || v.includes('uploads'))) {
              imageUrl = v.startsWith('http') ? stripPresigned(v) : null;
              if (imageUrl && imageUrl.includes('thebackend.in') && S3_BASE) {
                try {
                  const u = new URL(imageUrl);
                  imageUrl = S3_BASE + (u.pathname.startsWith('/') ? u.pathname : '/' + u.pathname);
                } catch {
                  imageUrl = null;
                }
              }
              if (imageUrl) break;
            }
          }
        }
      }

      if (!imageUrl && postContent) {
        imageUrl = firstImgSrc(postContent);
      }

      if (!imageUrl) {
        noImage++;
        continue;
      }

      const urlTrunc = imageUrl.slice(0, 500);
      if (!dryRun) {
        await zoxConn.query(
          `UPDATE posts SET featured_image_url = ?, featured_image_small_url = ? WHERE id = ?`,
          [urlTrunc, urlTrunc, row.id]
        );
      }
      updated++;
      if (updated <= 10) {
        console.log(`   ${dryRun ? '[dry-run] ' : ''}id=${row.id} slug=${slug.slice(0, 40)}... -> ${urlTrunc.slice(0, 60)}...`);
      }
    }

    console.log(`\n   Updated: ${updated}${dryRun ? ' (dry run)' : ''}`);
    console.log(`   No WP post for slug: ${noWpPost}`);
    console.log(`   WP post but no image found: ${noImage}`);
    console.log('');

    wpConn.release();
    zoxConn.release();
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  } finally {
    if (wpPool) await wpPool.end();
    if (zoxPool) await zoxPool.end();
  }
}

main();
