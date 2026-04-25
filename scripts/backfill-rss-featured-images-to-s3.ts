/**
 * Backfill featured_image_url for published posts that have no featured image.
 * Strategy:
 * 1) Try first image found in post content.
 * 2) If missing, fetch source link HTML and use og:image/twitter:image.
 * 3) Upload non-S3 images to S3 and store S3 URL.
 *
 * Usage:
 *   npx tsx scripts/backfill-rss-featured-images-to-s3.ts --limit 500
 */

import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import { downloadAndUploadToS3, normalizeSourceImageUrl } from '../src/modules/rss-feeds/utils/image-to-s3';
import { extractImageUrlsFromHtml, extractPrimaryImageFromHtml } from '../src/modules/rss-feeds/utils/content-extract';

loadEnvConfig(process.cwd());

function getSourceLink(content: string): string {
  if (!content) return '';
  const m = content.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Source link/i);
  return m?.[1]?.trim() || '';
}

function isOurS3Url(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname;
    return host === 'startupnews-media-2026.s3.us-east-1.amazonaws.com'
      || (host === 's3.amazonaws.com' && u.pathname.replace(/^\/+/, '').startsWith('startupnews-media-2026/'))
      || (host.endsWith('.s3.us-east-1.amazonaws.com') && host.startsWith('startupnews-media-2026.'));
  } catch {
    return false;
  }
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'StartupNews-ImageBackfill/1.0',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
    || (process.argv.includes('--limit') ? process.argv[process.argv.indexOf('--limit') + 1] : '');
  const limit = Math.max(1, parseInt((limitArg || '').replace('--limit=', ''), 10) || 500);

  const rows = await query<{
    id: number;
    title: string;
    content: string;
    slug: string;
  }>(
    `SELECT id, title, content, slug
     FROM posts
     WHERE status = 'published'
       AND (featured_image_url IS NULL OR featured_image_url = '')
     ORDER BY id DESC
     LIMIT ?`,
    [limit]
  );

  console.log(`Found ${rows.length} posts missing featured images (limit=${limit}).`);
  let updated = 0;
  let noImage = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const content = String(row.content || '');
    const sourceLink = getSourceLink(content);
    const baseUrl = sourceLink ? new URL(sourceLink).origin : '';

    let candidate = '';
    const contentImages = extractImageUrlsFromHtml(content, baseUrl);
    if (contentImages.length > 0) candidate = normalizeSourceImageUrl(contentImages[0]);

    if (!candidate && sourceLink) {
      const html = await fetchHtml(sourceLink);
      if (html) {
        const primary = extractPrimaryImageFromHtml(html, baseUrl);
        if (primary) candidate = normalizeSourceImageUrl(primary);
      }
    }

    if (!candidate) {
      noImage++;
      continue;
    }

    let finalS3 = '';
    if (isOurS3Url(candidate)) {
      finalS3 = candidate;
    } else {
      const uploaded = await downloadAndUploadToS3(candidate, `backfill-${row.id}`);
      finalS3 = uploaded || '';
    }

    if (!finalS3) {
      failed++;
      continue;
    }

    await query(
      `UPDATE posts
       SET featured_image_url = ?, featured_image_small_url = ?
       WHERE id = ?`,
      [finalS3.slice(0, 500), finalS3.slice(0, 500), row.id]
    );
    updated++;

    if (updated <= 15) {
      console.log(`Updated #${row.id} ${row.title.slice(0, 60)}...`);
    }
  }

  console.log(`Done. Updated=${updated}, NoImageFound=${noImage}, FailedUpload=${failed}`);
  await closeDbConnection();
}

main().catch(async (err) => {
  console.error('Backfill failed:', err);
  await closeDbConnection();
  process.exit(1);
});

