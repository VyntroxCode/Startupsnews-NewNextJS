/**
 * Download image from URL and upload to S3. Returns public S3 URL.
 * Uses same env as sync-posts-from-wp-to-s3: AWS_*, S3_BUCKET, S3_IMAGE_BASE_URL, S3_UPLOAD_PREFIX.
 */

import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { imageSize } from 'image-size';

/** Minimum bytes for an image to be used as featured (avoids 1x1 placeholders / tracking pixels). */
const MIN_FEATURED_BYTES = 2048;
/** Minimum width/height in pixels for featured image (avoids logos and tiny icons). */
const MIN_FEATURED_DIMENSION = 200;

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'startupnews-media-2026';
const S3_BASE_URL = (process.env.S3_IMAGE_BASE_URL || process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '')
  .replace(/\/$/, '') || `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;
const S3_UPLOAD_PREFIX = (process.env.S3_UPLOAD_PREFIX || 'startupnews-in').replace(/^\/|\/$/g, '');

function s3KeyWithPrefix(relativeKey: string): string {
  return S3_UPLOAD_PREFIX ? `${S3_UPLOAD_PREFIX}/${relativeKey}` : relativeKey;
}

export function getS3BaseUrl(): string {
  return S3_BASE_URL;
}

export function getS3Bucket(): string {
  return S3_BUCKET;
}

/** Generate S3 key for an image: prefix/uploads/YYYY/MM/rss-{id}.ext */
export function s3KeyForRssImage(uniqueId: string, imageUrl: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const ext = (imageUrl.split('.').pop()?.split(/[?#]/)[0] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return s3KeyWithPrefix(`uploads/${y}/${m}/rss-${uniqueId}.${ext}`);
}

/** Generate S3 key for admin-uploaded image: prefix/uploads/YYYY/MM/admin-{timestamp}-{random}.ext */
export function s3KeyForAdminUpload(originalName: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const ext = (originalName.split('.').pop()?.split(/[?#]/)[0] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return s3KeyWithPrefix(`uploads/${y}/${m}/admin-${unique}.${ext}`);
}

/** Generate S3 key for event image: prefix/uploads/YYYY/MM/event-{slug}.ext */
export function s3KeyForEventImage(slug: string, imageUrlOrExt: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const ext = (imageUrlOrExt.split('.').pop()?.split(/[?#]/)[0] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, '-').slice(0, 80);
  return s3KeyWithPrefix(`uploads/${y}/${m}/event-${safeSlug}.${ext}`);
}

/** Generate S3 key for manual post image (from URL): prefix/uploads/YYYY/MM/manual-{timestamp}-{random}.ext */
export function s3KeyForManualPostImage(imageUrl: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const ext = (imageUrl.split('.').pop()?.split(/[?#]/)[0] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return s3KeyWithPrefix(`uploads/${y}/${m}/manual-${unique}.${ext}`);
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

export function getContentType(url: string): string {
  const ext = (url.split('.').pop()?.split(/[?#]/)[0] || '').toLowerCase();
  return CONTENT_TYPES[ext] || 'image/jpeg';
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/**
 * Normalize tricky feed image URLs:
 * - Decode HTML entities.
 * - Unwrap wrappers like https://site.com/https://s3.amazonaws.com/bucket/key.
 */
export function normalizeSourceImageUrl(url: string): string {
  const raw = decodeHtmlEntities((url || '').trim());
  if (!raw) return '';
  const https = raw.lastIndexOf('https://');
  const http = raw.lastIndexOf('http://');
  const lastAbs = https >= 0 && http >= 0 ? Math.max(https, http) : Math.max(https, http);
  if (lastAbs > 0) {
    return raw.slice(lastAbs);
  }
  return raw;
}

export async function downloadImage(url: string): Promise<Buffer | null> {
  const normalized = normalizeSourceImageUrl(url);
  const candidates = [normalized];
  // Fallback without query params (some sources deny resized/proxied variants).
  const qIdx = normalized.indexOf('?');
  if (qIdx > 0) candidates.push(normalized.slice(0, qIdx));

  try {
    for (const candidate of candidates) {
      if (!candidate) continue;
      const res = await fetch(candidate, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 0) return buf;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Return true if the image buffer is suitable as a featured image (not a placeholder/tiny/white).
 * Rejects small files and dimensions to avoid 1x1 pixels, tracking GIFs, and logos.
 */
export function isValidFeaturedImage(buffer: Buffer): boolean {
  if (!buffer || buffer.length < MIN_FEATURED_BYTES) return false;
  try {
    const dims = imageSize(buffer);
    const w = dims?.width ?? 0;
    const h = dims?.height ?? 0;
    return w >= MIN_FEATURED_DIMENSION && h >= MIN_FEATURED_DIMENSION;
  } catch {
    return false;
  }
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  const key = (process.env.AWS_ACCESS_KEY_ID ?? '').replace(/^["']|["']$/g, '').trim();
  const secret = (process.env.AWS_SECRET_ACCESS_KEY ?? '').replace(/^["']|["']$/g, '').trim();
  if (!key || !secret) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: AWS_REGION.trim(),
      credentials: { accessKeyId: key, secretAccessKey: secret },
    });
  }
  return s3Client;
}

export function isS3Configured(): boolean {
  return !!getS3Client();
}

export async function uploadImageToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const s3 = getS3Client();
  if (!s3) {
    throw new Error('S3 client not configured. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }
  
  if (!key || !body || body.length === 0) {
    throw new Error('Invalid upload parameters: key and body are required');
  }
  
  try {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || 'image/jpeg',
      CacheControl: 'public, max-age=31536000',
    })
  );
    
    // Construct the full S3 URL
    const url = `${S3_BASE_URL}/${key}`;
    return url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown S3 error';
    const errorName = error instanceof Error ? error.name : 'Error';
    
    // Provide more specific error messages
    if (errorName === 'InvalidAccessKeyId') {
      throw new Error(`S3 Authentication Failed: Invalid AWS Access Key ID. Please verify AWS_ACCESS_KEY_ID.`);
    }
    if (errorName === 'SignatureDoesNotMatch') {
      throw new Error(`S3 Authentication Failed: Invalid AWS Secret Access Key. Please verify AWS_SECRET_ACCESS_KEY.`);
    }
    if (errorName === 'NoSuchBucket') {
      throw new Error(`S3 Bucket Not Found: The bucket "${S3_BUCKET}" does not exist. Please verify S3_BUCKET configuration.`);
    }
    if (errorName === 'AccessDenied') {
      throw new Error(`S3 Access Denied: The AWS credentials do not have permission to upload to bucket "${S3_BUCKET}". Please check IAM permissions.`);
    }
    
    throw new Error(`S3 Upload Failed: ${errorMessage}`);
  }
}

/** Download image from URL and upload to S3. Returns S3 URL or null on failure. */
export async function downloadAndUploadToS3(
  imageUrl: string,
  uniqueId: string
): Promise<string | null> {
  const buf = await downloadImage(imageUrl);
  if (!buf) return null;
  const key = s3KeyForRssImage(uniqueId, imageUrl);
  const contentType = getContentType(imageUrl);
  try {
    return await uploadImageToS3(key, buf, contentType);
  } catch {
    return null;
  }
}

/**
 * Download image, validate it is suitable for featured (size + dimensions), then upload to S3.
 * Returns S3 URL or null if download fails, image is too small/placeholder, or upload fails.
 * Use this for featured image candidates to avoid white/tiny/placeholder images.
 */
export async function downloadAndUploadFeaturedToS3(
  imageUrl: string,
  uniqueId: string
): Promise<string | null> {
  const buf = await downloadImage(imageUrl);
  if (!buf || !isValidFeaturedImage(buf)) return null;
  const key = s3KeyForRssImage(uniqueId, imageUrl);
  const contentType = getContentType(imageUrl);
  try {
    return await uploadImageToS3(key, buf, contentType);
  } catch {
    return null;
  }
}

/** Download event banner from URL and upload to S3 with event-{slug} key. Returns S3 URL or null. */
export async function downloadAndUploadEventImageToS3(
  slug: string,
  imageUrl: string
): Promise<string | null> {
  const buf = await downloadImage(imageUrl);
  if (!buf) return null;
  const key = s3KeyForEventImage(slug, imageUrl);
  const contentType = getContentType(imageUrl);
  try {
    return await uploadImageToS3(key, buf, contentType);
  } catch {
    return null;
  }
}

/** Return true if URL is our S3 bucket (so we don't re-upload). */
export function isOurS3ImageUrl(url: string): boolean {
  const s = (url || '').trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    const host = u.hostname;
    const bucket = S3_BUCKET;
    return (
      host === `${bucket}.s3.${AWS_REGION}.amazonaws.com` ||
      host === 's3.amazonaws.com' ||
      (host.endsWith('.s3.us-east-1.amazonaws.com') && host.startsWith(`${bucket}.`))
    );
  } catch {
    return false;
  }
}

/** Download image from URL and upload to S3 for manual post (same flow as RSS). Returns S3 URL or null. */
export async function downloadAndUploadManualPostImageToS3(imageUrl: string): Promise<string | null> {
  const normalized = normalizeSourceImageUrl(imageUrl);
  const buf = await downloadImage(normalized);
  if (!buf) return null;
  const key = s3KeyForManualPostImage(normalized);
  const contentType = getContentType(normalized);
  try {
    return await uploadImageToS3(key, buf, contentType);
  } catch {
    return null;
  }
}

/** Check S3 is reachable (optional pre-check). */
export async function checkS3Bucket(): Promise<void> {
  const s3 = getS3Client();
  if (!s3) throw new Error('S3 not configured');
  await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
}

/** Check if a URL points to an image file vs a webpage */
export function isImageUrl(url: string): boolean {
  const normalized = (url || '').toLowerCase();
  // Remove presigned params for checking
  const urlWithoutParams = normalized.split('?')[0];
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasImageExt = imageExtensions.some(ext => urlWithoutParams.includes(ext));
  const hasNoPageExt = !urlWithoutParams.includes('.html') && !urlWithoutParams.includes('.htm');
  
  return hasImageExt || (hasNoPageExt && urlWithoutParams.includes('image'));
}

/** Extract og:image URL from webpage HTML content */
export function extractOgImageFromHtml(html: string): string | null {
  try {
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      return ogImageMatch[1];
    }
    // Fallback: try alternate format
    const twitterMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (twitterMatch && twitterMatch[1]) {
      return twitterMatch[1];
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/** 
 * If URL is a webpage (not image), try to extract og:image from it.
 * Returns the extracted image URL or the original URL if extraction fails.
 */
export async function resolveImageUrlFromWebpage(url: string): Promise<string | null> {
  if (!url) return null;
  
  // If it's already an image URL, return as-is
  if (isImageUrl(url)) {
    return url;
  }

  // Try to fetch the webpage and extract og:image
  try {
    const normalized = normalizeSourceImageUrl(url);
    const res = await fetch(normalized, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const html = await res.text();
      const ogImage = extractOgImageFromHtml(html);
      if (ogImage) {
        return ogImage;
      }
    }
  } catch {
    // If fetching fails, continue with original URL
  }

  // If extraction failed, return null to indicate page URL without image
  return null;
}
