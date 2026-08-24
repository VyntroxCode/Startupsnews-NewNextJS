/**
 * Rewrite our own S3 bucket URLs to serve through the CloudFront CDN (NEXT_PUBLIC_IMAGE_CDN_URL)
 * for public-facing display. Unset env = returns the URL unchanged (serves straight from S3).
 *
 * Only call this on the read/display path (API responses, page rendering) — never on a value
 * that flows back into an admin edit form's "current image" field. If an admin saves that form
 * without changing the image, the CDN URL would get written back into the DB in place of the
 * real S3 URL, and there'd be no way to recover the original if the CDN config ever changes.
 */

function getS3ImageHost(): string {
  const base = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_IMAGE_BASE_URL) || '';
  if (base) {
    try {
      return new URL(base).hostname;
    } catch {
      /* ignore */
    }
  }
  return 'startupnews-media-2026.s3.us-east-1.amazonaws.com';
}

function getCdnBaseUrl(): string {
  const cdn = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_IMAGE_CDN_URL) || '';
  return cdn.trim().replace(/\/$/, '');
}

/** True when the URL's host is our own S3 bucket (any of its address forms). */
function isOurBucketUrl(u: URL): boolean {
  const host = u.hostname;
  const s3Host = getS3ImageHost();
  return (
    host === s3Host ||
    (host === 's3.amazonaws.com' && u.pathname.replace(/^\/+/, '').startsWith('startupnews-media-2026/')) ||
    (host.endsWith('.s3.us-east-1.amazonaws.com') && host.startsWith('startupnews-media-2026.'))
  );
}

/**
 * Rewrite a URL to the CDN host (same path/query) when it's from our S3 bucket and
 * NEXT_PUBLIC_IMAGE_CDN_URL is set; otherwise returns it unchanged. Empty/invalid input returns ''.
 */
export function toCdnUrl(url: string | null | undefined): string {
  const s = typeof url === 'string' ? url.trim() : '';
  if (!s) return '';
  const cdnBase = getCdnBaseUrl();
  if (!cdnBase) return s;
  try {
    const u = new URL(s);
    if (!isOurBucketUrl(u)) return s;
    return cdnBase + u.pathname + u.search;
  } catch {
    return s;
  }
}
