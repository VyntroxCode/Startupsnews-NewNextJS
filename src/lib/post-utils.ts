/**
 * Client-safe post helpers (no server/database imports).
 * Use this in client components instead of data-adapter when you only need hasThumbnail / getPostImage.
 */

/** Default thumbnail when post has no image (must match data-adapter DEFAULT_POST_IMAGE for consistency). */
export const DEFAULT_POST_IMAGE =
  '/images/banner-fallback.svg';

/** Returns post image URL or default placeholder. Client-safe; use in client components instead of data-adapter.getPostImage. */
export function getPostImage(post: { image?: string; imageSmall?: string }): string {
  const url = (post.image || '').trim();
  return url || DEFAULT_POST_IMAGE;
}

/** Only the big (featured) image counts; small image is never shown site-wide. */
export function hasThumbnail(post: { image?: string; imageSmall?: string }): boolean {
  return (post.image || '').trim().length > 0;
}

/**
 * Normalize stored post slug for category-based URLs.
 * If DB slug is "tech/my-post" and category is "tech", returns "my-post".
 */
export function normalizePostSlugForCategory(categorySlug: string, slug: string): string {
  const cat = (categorySlug || '').replace(/^\/+|\/+$/g, '');
  const raw = (slug || '').replace(/^\/+|\/+$/g, '');
  if (!raw) return '';
  const prefix = `${cat}/`;
  return raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
}

/** Canonical public URL for a post: /{categorySlug}/{normalizedSlug}. */
export function getPostPath(post: { categorySlug: string; slug: string }): string {
  const leaf = normalizePostSlugForCategory(post.categorySlug, post.slug);
  return `/${post.categorySlug}/${leaf}`;
}

/**
 * Turns excerpt (or any text) into a clean news brief: no full HTML, no {ad} placeholders.
 * Single post page uses this instead of full body content.
 */
export function toNewsBrief(text: string | undefined): string {
  if (!text || typeof text !== 'string') return '';
  let out = text
    .replace(/\s*\{ad(?:\s*[^}]*)?\}\s*/gi, ' ')
    .replace(/\s*\{advertisement(?:\s*[^}]*)?\}\s*/gi, ' ')
    .replace(/\s*\{[^}]*\}\s*/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}

/**
 * Removes leading <img> tags in html whose src matches the featured URL,
 * so the single post page doesn't show the same image 2–3 times (hero + in body).
 */
export function stripFeaturedImageFromContent(html: string, featuredUrl: string): string {
  if (!html?.trim() || !featuredUrl?.trim()) return html;

  const normalize = (u: string): string => {
    const raw = (u || '')
      .trim()
      .replace(/&amp;/gi, '&')
      .replace(/&#038;/gi, '&');
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      // Compare by hostname+pathname only so query/hash/resizing params don't block dedupe.
      return `${parsed.hostname.toLowerCase()}${parsed.pathname}`.replace(/\/+$/, '');
    } catch {
      return raw
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .split('?')[0]
        .split('#')[0]
        .replace(/\/+$/, '')
        .toLowerCase();
    }
  };

  const featuredNorm = normalize(featuredUrl);
  if (!featuredNorm) return html;

  const isSameAsFeatured = (candidate: string): boolean => {
    const c = normalize(candidate);
    if (!c) return false;
    return c === featuredNorm || c.includes(featuredNorm) || featuredNorm.includes(c);
  };

  let out = html;

  // Remove any full figure blocks that contain the featured image.
  out = out.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figure) => {
    const attrs = [...figure.matchAll(/(?:src|data-src)=["']([^"']+)["']/gi)].map((m) => m[1]);
    const srcsetParts = [...figure.matchAll(/srcset=["']([^"']+)["']/gi)]
      .flatMap((m) => m[1].split(','))
      .map((p) => p.trim().split(/\s+/)[0])
      .filter(Boolean);
    const urls = [...attrs, ...srcsetParts];
    return urls.some(isSameAsFeatured) ? '' : figure;
  });

  // Remove standalone img tags that match featured image (including lazy attrs/srcset variants).
  out = out.replace(/<img\b[^>]*>/gi, (imgTag) => {
    const attrs = [...imgTag.matchAll(/(?:src|data-src)=["']([^"']+)["']/gi)].map((m) => m[1]);
    const srcsetParts = [...imgTag.matchAll(/srcset=["']([^"']+)["']/gi)]
      .flatMap((m) => m[1].split(','))
      .map((p) => p.trim().split(/\s+/)[0])
      .filter(Boolean);
    const urls = [...attrs, ...srcsetParts];
    return urls.some(isSameAsFeatured) ? '' : imgTag;
  });

  return out;
}
