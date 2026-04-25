/**
 * Run S3 images diagnostic (same logic as GET /api/debug/s3-images).
 * Usage: npx tsx scripts/run-s3-images-diagnostic.ts
 */
import { loadEnvConfig } from '@next/env';
import mariadb from 'mariadb';

loadEnvConfig(process.cwd());

const BUCKET = (process.env.S3_BUCKET || 'startupnews-media-2026').trim();
const S3_HOST = 'startupnews-media-2026.s3.us-east-1.amazonaws.com';

function parseS3UrlToBucketKey(url: string): { bucket: string; key: string } | null {
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s) return null;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, '');
    if (u.hostname === S3_HOST || (u.hostname.endsWith('.s3.us-east-1.amazonaws.com') && u.hostname.startsWith('startupnews-media-2026.'))) {
      const key = path || '';
      if (key) return { bucket: BUCKET, key };
    }
    if (u.hostname === 's3.amazonaws.com' && path.startsWith('startupnews-media-2026/')) {
      const key = path.slice('startupnews-media-2026/'.length);
      return { bucket: BUCKET, key };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function toPresignedUrlIfEnabled(s3ObjectUrl: string): Promise<string> {
  const explicitlyOff = process.env.S3_USE_PRESIGNED_URLS === 'false' || process.env.S3_USE_PRESIGNED_URLS === '0';
  if (explicitlyOff) return s3ObjectUrl;
  const parsed = parseS3UrlToBucketKey(s3ObjectUrl);
  if (!parsed) return s3ObjectUrl;
  const key = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!key || !secret) return s3ObjectUrl;
  try {
    const [{ getSignedUrl }, { S3Client, GetObjectCommand }] = await Promise.all([
      import('@aws-sdk/s3-request-presigner'),
      import('@aws-sdk/client-s3'),
    ]);
    const region = (process.env.AWS_REGION || 'us-east-1').trim();
    const client = new S3Client({
      region,
      credentials: {
        accessKeyId: key.replace(/^["']|["']$/g, ''),
        secretAccessKey: secret.replace(/^["']|["']$/g, ''),
      },
    });
    const expiresIn = Math.min(86400, Math.max(300, parseInt(process.env.S3_PRESIGNED_EXPIRES_SECONDS || '3600', 10) || 3600));
    return await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key }),
      { expiresIn }
    );
  } catch (err) {
    throw err;
  }
}

async function main() {
  const hasKey = Boolean(process.env.AWS_ACCESS_KEY_ID?.trim());
  const hasSecret = Boolean(process.env.AWS_SECRET_ACCESS_KEY?.trim());
  const presignOff = process.env.S3_USE_PRESIGNED_URLS === 'false' || process.env.S3_USE_PRESIGNED_URLS === '0';

  const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'zox_db',
  });

  let rows: { id: number; title: string; featured_image_url: string | null }[] = [];
  try {
    rows = await pool.query(
      'SELECT id, title, featured_image_url FROM posts WHERE status = ? ORDER BY id DESC LIMIT 3',
      ['published']
    );
  } finally {
    await pool.end();
  }

  const sample = rows[0];
  if (!sample) {
    console.log(JSON.stringify({
      ok: true,
      aws: { hasAccessKeyId: hasKey, hasSecretAccessKey: hasSecret, presignDisabled: presignOff, willPresign: hasKey && hasSecret && !presignOff },
      sample: null,
      hint: 'No published posts in DB.',
    }, null, 2));
    return;
  }

  let rawUrl = sample.featured_image_url ?? '';
  if (rawUrl && typeof rawUrl !== 'string') rawUrl = String(rawUrl);
  const rawTruncated = rawUrl ? rawUrl.slice(0, 120) + (rawUrl.length > 120 ? '...' : '') : '(empty)';
  const isS3 = rawUrl ? Boolean(parseS3UrlToBucketKey(rawUrl)) : false;
  let finalUrl = '';
  let presignOk = false;
  if (rawUrl && isS3) {
    try {
      finalUrl = await toPresignedUrlIfEnabled(rawUrl);
      presignOk = finalUrl.includes('X-Amz-Signature') || finalUrl.includes('x-amz-signature');
    } catch (e) {
      finalUrl = '(presign error: ' + (e instanceof Error ? e.message : String(e)) + ')';
    }
  } else if (rawUrl) {
    finalUrl = '(not S3 URL – app shows placeholder)';
  } else {
    finalUrl = '(no URL in DB – app shows placeholder)';
  }

  const hint = !hasKey || !hasSecret
    ? 'Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in this app\'s environment so presigned URLs can be generated.'
    : !isS3 && rawUrl
      ? 'DB has non-S3 image URL; app only shows S3 images. Re-run sync to upload images to S3 and store S3 URLs.'
      : !isS3 && !rawUrl
        ? 'DB has no image URL for this post. Run sync or backfill to set featured_image_url.'
        : presignOk
          ? 'Presigning is working; if images still show placeholder, check browser Network tab for image request (403 = bucket private, use presigned).'
          : 'Presigning may have failed (wrong key/secret or region). Check server logs.';

  console.log(JSON.stringify({
    ok: true,
    aws: {
      hasAccessKeyId: hasKey,
      hasSecretAccessKey: hasSecret,
      presignDisabled: presignOff,
      willPresign: hasKey && hasSecret && !presignOff,
    },
    sample: {
      postId: sample.id,
      title: sample.title?.slice(0, 50),
      featured_image_url_in_db: rawTruncated,
      is_s3_url: isS3,
      final_image_url_preview: finalUrl.slice(0, 100) + (finalUrl.length > 100 ? '...' : ''),
      presigned_used: presignOk,
    },
    hint,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
