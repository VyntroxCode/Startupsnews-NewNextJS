/**
 * Generate presigned GET URLs for S3 objects so images load when the bucket is not public.
 * Used when S3_USE_PRESIGNED_URLS=true and AWS credentials are set.
 * Presigned URLs expire (default 7 days); they are generated at request time on the server.
 */
import { s3ClientConfig, s3CredentialsAvailable } from '@/shared/utils/s3-client-config';

const BUCKET = (process.env.S3_BUCKET || 'startupnews-media-2026').trim();
const S3_HOST = 'startupnews-media-2026.s3.us-east-1.amazonaws.com';

/** Parse S3 virtual-hosted or path-style URL to { bucket, key }. Returns null if not our bucket. */
export function parseS3UrlToBucketKey(url: string): { bucket: string; key: string } | null {
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s) return null;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, '');
    if (u.hostname === S3_HOST || (u.hostname.endsWith('.s3.us-east-1.amazonaws.com') && u.hostname.startsWith('startupnews-media-2026.'))) {
      const bucket = BUCKET;
      const key = path || '';
      if (key) return { bucket, key };
    }
    if (u.hostname === 's3.amazonaws.com' && path.startsWith('startupnews-media-2026/')) {
      const bucket = BUCKET;
      const key = path.slice('startupnews-media-2026/'.length);
      return { bucket, key };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * If we have AWS credentials and the URL is our S3 object, return a presigned GET URL so images load when the bucket is private.
 * Set S3_USE_PRESIGNED_URLS=false or 0 to disable (e.g. when bucket is public).
 * Presigned URLs expire (default 7 days) and are generated at request time.
 */
export async function toPresignedUrlIfEnabled(s3ObjectUrl: string): Promise<string> {
  const explicitlyOff = process.env.S3_USE_PRESIGNED_URLS === 'false' || process.env.S3_USE_PRESIGNED_URLS === '0';
  if (explicitlyOff) return s3ObjectUrl;

  const parsed = parseS3UrlToBucketKey(s3ObjectUrl);
  if (!parsed) return s3ObjectUrl;

  if (!s3CredentialsAvailable()) return s3ObjectUrl;

  try {
    const [{ getSignedUrl }, { S3Client, GetObjectCommand }] = await Promise.all([
      import('@aws-sdk/s3-request-presigner'),
      import('@aws-sdk/client-s3'),
    ]);
    const client = new S3Client(s3ClientConfig());
    // SigV4 presigned URLs support up to 7 days (604800s).
    const expiresIn = Math.min(604800, Math.max(300, parseInt(process.env.S3_PRESIGNED_EXPIRES_SECONDS || '604800', 10) || 604800));
    const signed = await getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key }),
      { expiresIn }
    );
    return signed;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[s3-presign] Failed to generate presigned URL:', err instanceof Error ? err.message : err);
    }
    return s3ObjectUrl;
  }
}
