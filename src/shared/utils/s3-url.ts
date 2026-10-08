/**
 * Presigned S3 URLs (…?X-Amz-Algorithm=…&X-Amz-Signature=…) expire, 7 days by default.
 * Pages are rendered with presigned image URLs, and the admin editor can save such a URL back
 * into a post, which breaks the image a week later. Storage must always hold the permanent
 * object URL; these helpers strip the signature before a write.
 */

const PRESIGN_MARKER = /x-amz-(algorithm|signature|credential)=/i;

export function stripS3PresignedQuery(url: string | null | undefined): string | null | undefined {
  if (typeof url !== 'string') return url;
  const s = url.trim();
  const q = s.indexOf('?');
  if (q === -1) return s;
  return PRESIGN_MARKER.test(s.slice(q + 1)) ? s.slice(0, q) : s;
}

/** Strip presigned query strings from every URL inside an HTML fragment (img src, href, srcset). */
export function stripS3PresignedQueriesInHtml(html: string | null | undefined): string | null | undefined {
  if (typeof html !== 'string' || !PRESIGN_MARKER.test(html)) return html;
  return html.replace(
    /(https?:\/\/[^\s"'<>]*?amazonaws\.com\/[^\s"'<>?]*)\?[^\s"'<>]*/gi,
    (match, base: string) => (PRESIGN_MARKER.test(match) ? base : match),
  );
}
