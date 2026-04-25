/**
 * Diagnostic: check if posts load from DB and what image URLs they have.
 * Shows resolved URL (same as app) for link mismatch debugging.
 * Run: npx tsx scripts/check-post-images.ts
 */
import { loadEnvConfig } from '@next/env';
import { query } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const BASE = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '').replace(/\/$/, '');

function trim(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (Buffer.isBuffer(v)) return v.toString('utf8').trim();
  return String(v).trim();
}

function stripPresigned(url: string): string {
  const q = url.indexOf('?');
  if (q === -1) return url;
  if (/X-Amz-Algorithm|x-amz-algorithm/i.test(url.slice(q + 1))) return url.slice(0, q);
  return url;
}

function collapseSlashes(url: string): string {
  return url.replace(/([^:]\/)\/+/g, '$1');
}

function unwrapDoubleUrl(raw: string): string {
  if (!BASE || !raw.startsWith(BASE)) return raw;
  const rest = raw.slice(BASE.length).replace(/^\/+/, '');
  if (rest.startsWith('https://') || rest.startsWith('http://')) return rest;
  return raw;
}

/** When value has multiple concatenated URLs, use the last one. */
function extractSingleUrl(s: string): string {
  const https = s.lastIndexOf('https://');
  const http = s.lastIndexOf('http://');
  const last = https >= 0 && http >= 0 ? Math.max(https, http) : https >= 0 ? https : http;
  if (last >= 0) return s.slice(last);
  return s;
}

/** s3://bucket/key -> https://bucket.s3.us-east-1.amazonaws.com/key */
function s3UriToHttps(s3Uri: string): string {
  const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(s3Uri.trim());
  if (!m) return s3Uri;
  const [, bucket, key] = m;
  if (BASE && BASE.includes(bucket)) return BASE + '/' + key;
  return `https://${bucket}.s3.us-east-1.amazonaws.com/${key}`;
}

function resolveUrl(raw: string): string {
  let s = trim(raw);
  if (!s) return s;
  if (s.startsWith('s3://')) s = s3UriToHttps(s);
  let out = s.startsWith('http://') || s.startsWith('https://')
    ? extractSingleUrl(unwrapDoubleUrl(s))
    : BASE ? BASE + (s.startsWith('/') ? s : '/' + s) : s;
  out = stripPresigned(out);
  out = collapseSlashes(out);
  if (out.startsWith('https://')) {
    try {
      const u = new URL(out);
      if (u.hostname === 's3.amazonaws.com' && u.pathname.replace(/^\/+/, '').split('/').length >= 2) {
        const pathParts = u.pathname.replace(/^\/+/, '').split('/');
        const bucket = pathParts[0];
        const key = pathParts.slice(1).join('/');
        out = BASE && BASE.includes(bucket) ? BASE + '/' + key : `https://${bucket}.s3.us-east-1.amazonaws.com/${key}`;
      }
    } catch {
      /* leave out */
    }
  }
  return out;
}

async function main() {
  console.log('\n📷 Post image diagnostic (DB + resolved URLs)\n');

  const countResult = await query(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN featured_image_url IS NOT NULL AND TRIM(featured_image_url) != '' THEN 1 ELSE 0 END) AS with_url FROM posts WHERE status = 'published'"
  ) as Array<{ total: number; with_url: number }>;
  const { total, with_url } = countResult[0] ?? { total: 0, with_url: 0 };
  console.log(`   Published posts: ${total} total, ${with_url} with featured_image_url set.`);
  console.log(`   NEXT_PUBLIC_IMAGE_BASE_URL: ${BASE || '(not set)'}\n`);

  const rowsWithImg = await query(
    "SELECT id, title, featured_image_url, featured_image_small_url FROM posts WHERE status = 'published' AND featured_image_url IS NOT NULL AND TRIM(featured_image_url) != '' ORDER BY published_at DESC LIMIT 8"
  ) as Array<Record<string, unknown>>;

  if (rowsWithImg.length > 0) {
    console.log('   Sample posts WITH image – resolved URL (what the app sends to frontend):\n');
    for (const row of rowsWithImg) {
      const main = trim(row.featured_image_url ?? row['featured_image_url']);
      const resolved = resolveUrl(main);
      console.log(`   id=${row.id} ${(row.title as string)?.slice(0, 35)}...`);
      console.log(`      DB:    ${main.slice(0, 70)}${main.length > 70 ? '...' : ''}`);
      console.log(`      Used:  ${resolved.slice(0, 70)}${resolved.length > 70 ? '...' : ''}`);
      console.log('');
    }
  }

  const rows = await query(
    'SELECT id, title, featured_image_url, featured_image_small_url FROM posts WHERE status = ? ORDER BY published_at DESC LIMIT 12',
    ['published']
  ) as Array<Record<string, unknown>>;

  if (rows.length === 0) {
    console.log('   No published posts in DB.\n');
    return;
  }

  console.log('   Column keys in first row:', Object.keys(rows[0]).join(', '));
  console.log('');

  let withUrl = 0;
  let withS3 = 0;
  let empty = 0;

  for (const row of rows) {
    const id = row.id;
    const title = (row.title as string)?.slice(0, 40) || '';
    const main = row.featured_image_url ?? row['featured_image_url'];
    const small = row.featured_image_small_url ?? row['featured_image_small_url'];
    const mainStr = trim(main);
    const smallStr = trim(small);
    const hasUrl = mainStr.length > 0 || smallStr.length > 0;
    const isS3 = /s3\.amazonaws\.com|\.s3\.|amazonaws\.com/.test(mainStr || smallStr);

    if (hasUrl) withUrl++;
    if (isS3) withS3++;
    if (!hasUrl) empty++;

    console.log(`   id=${id} ${title}...`);
    console.log(`      featured_image_url: ${mainStr ? mainStr.slice(0, 80) + (mainStr.length > 80 ? '...' : '') : '(empty)'}`);
    console.log(`      featured_image_small_url: ${smallStr ? smallStr.slice(0, 80) + (smallStr.length > 80 ? '...' : '') : '(empty)'}`);
    console.log('');
  }

  console.log('   Summary: with any image URL:', withUrl, '| S3 URL:', withS3, '| empty:', empty);
  console.log('');
}

main().catch((e) => { console.error(e); process.exit(1); });
