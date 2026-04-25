/**
 * One-time script: normalize post image URLs in the DB so images show on the website.
 *
 * - Strips S3 presigned query params (?X-Amz-Algorithm=...) so URLs are permanent.
 * - Converts relative paths (e.g. /uploads/...) to full S3 URLs using S3_IMAGE_BASE_URL.
 *
 * Requires .env.local with DB_* and:
 *   S3_IMAGE_BASE_URL=https://startupnews-media-2026.s3.us-east-1.amazonaws.com
 *
 * Usage: npm run db:fix-post-images
 */

import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const S3_BASE = (process.env.S3_IMAGE_BASE_URL || process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '').replace(/\/$/, '');

function stripPresigned(url: string): string {
  const s = url.trim();
  if (!s) return s;
  const q = s.indexOf('?');
  if (q === -1) return s;
  if (/X-Amz-Algorithm|x-amz-algorithm/i.test(s.slice(q + 1))) return s.slice(0, q);
  return s;
}

function normalizeUrl(raw: unknown): string | null {
  if (raw == null) return null;
  const s = (typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)).trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return stripPresigned(s);
  }
  if (S3_BASE) {
    const path = s.startsWith('/') ? s : '/' + s;
    return S3_BASE + path;
  }
  return null;
}

async function main() {
  if (!S3_BASE) {
    console.error('\n❌ Set S3_IMAGE_BASE_URL or NEXT_PUBLIC_IMAGE_BASE_URL in .env.local');
    console.error('   Example: S3_IMAGE_BASE_URL=https://startupnews-media-2026.s3.us-east-1.amazonaws.com\n');
    process.exit(1);
  }

  console.log('\n📷 Normalizing post image URLs in DB\n');
  console.log('   S3 base:', S3_BASE);

  try {
    const rows = await query(
      'SELECT id, featured_image_url, featured_image_small_url FROM posts'
    ) as Array<{ id: number; featured_image_url: unknown; featured_image_small_url: unknown }>;

    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const mainUrl = normalizeUrl(row.featured_image_url);
      const smallUrl = normalizeUrl(row.featured_image_small_url) ?? mainUrl;

      if (mainUrl == null && smallUrl == null) {
        skipped++;
        continue;
      }

      await query(
        'UPDATE posts SET featured_image_url = ?, featured_image_small_url = ? WHERE id = ?',
        [mainUrl ?? '', smallUrl ?? '', row.id]
      );
      updated++;
      if (updated <= 5) {
        console.log('   ✅ id', row.id, '→', (mainUrl ?? smallUrl ?? '').slice(0, 70) + '...');
      }
    }

    console.log('\n   Updated:', updated, 'posts');
    console.log('   Skipped (no URL to normalize):', skipped);
    console.log('\n   Run the site again; post images should load from S3.\n');
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await closeDbConnection();
  }
}

main();
