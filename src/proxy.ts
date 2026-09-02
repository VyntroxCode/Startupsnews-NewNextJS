import { NextRequest, NextResponse } from 'next/server';

function getSlugFromPath(pathname: string): string | null {
  const prefix = '/post/';
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).split('/')[0]?.trim();
  return slug || null;
}

// Rewrite https://localhost → http://localhost so internal API fetches work
// behind nginx which sets X-Forwarded-Proto: https on the forwarded request.
function toInternalOrigin(origin: string): string {
  return origin.replace(/^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, (_, host, port) => `http://${host}${port || ''}`);
}

// Lightweight in-process cache for robots + httpStatus.
// Posts almost never flip between published/410 after the first hour, so a
// long TTL is safe and keeps most requests off the extra network round-trip.
const robotsCache = new Map<string, { robots: string; httpStatus: number; expiresAt: number }>();
const ROBOTS_TTL_MS = 60 * 60 * 1000;
// De-dupe concurrent lookups for the same slug (e.g. a traffic spike on one
// article) so they share a single in-flight fetch instead of each firing one.
const inFlight = new Map<string, Promise<{ robots: string; httpStatus: number }>>();

async function getPostMeta(categorySlug: string, postSlug: string, origin: string): Promise<{ robots: string; httpStatus: number }> {
  // Cache key includes the category segment: legacy-imported posts store their
  // DB slug as "category/leaf", so the same leaf under two categories must not collide.
  const cacheKey = `${categorySlug}/${postSlug}`;
  const now = Date.now();
  const cached = robotsCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return { robots: cached.robots, httpStatus: cached.httpStatus };

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const url = `${toInternalOrigin(origin)}/api/posts/robots?slug=${encodeURIComponent(postSlug)}&category=${encodeURIComponent(categorySlug)}`;
      const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (!res.ok) return { robots: 'index,follow', httpStatus: 200 };
      const data = await res.json() as { robots?: string; httpStatus?: number };
      const robots = data?.robots || 'index,follow';
      const httpStatus = data?.httpStatus || 200;
      robotsCache.set(cacheKey, { robots, httpStatus, expiresAt: now + ROBOTS_TTL_MS });
      return { robots, httpStatus };
    } catch {
      return { robots: 'index,follow', httpStatus: 200 };
    } finally {
      inFlight.delete(cacheKey);
    }
  })();
  inFlight.set(cacheKey, promise);
  return promise;
}

function renderGoneHtml(slug: string, kind: 'post' | 'event' = 'post'): string {
  const isEvent = kind === 'event';
  const pageTitle = isEvent ? '410 - Event Removed' : '410 - Post Removed';
  const heading = isEvent
    ? 'This event is no longer available'
    : 'This post is no longer available';
  const body = isEvent
    ? 'The requested event listing has been removed or renamed and is no longer accessible.'
    : 'The requested article has been intentionally removed and is no longer accessible.';

  const safeSlug = slug.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { width: min(640px, 100%); background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06); }
    .code { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #b91c1c; }
    h1 { margin: 8px 0 10px; font-size: 28px; }
    p { margin: 0; color: #334155; line-height: 1.6; }
    .slug { margin-top: 14px; font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <div class="code">410 Gone</div>
      <h2>${heading}</h2>
      <p>${body}</p>
      <p class="slug">Slug: ${safeSlug}</p>
    </section>
  </main>
</body>
</html>`;
}

// Legacy WordPress-style date permalinks (e.g. /2020/01/15/old-post-title).
// The site never serves content at this URL shape (current posts live at
// /:category/:slug), so any match is a stale indexed URL — always 410.
const LEGACY_DATE_PERMALINK = /^\/\d{4}\/\d{1,2}\/\d{1,2}\//;

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (LEGACY_DATE_PERMALINK.test(pathname)) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return NextResponse.next();
    }
    if (request.method === 'HEAD') {
      return new NextResponse(null, {
        status: 410,
        headers: { 'Cache-Control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
    return new NextResponse(renderGoneHtml(pathname.replace(/^\/+/, '')), {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const slug = getSlugFromPath(pathname);

  // --- Handle /post/:slug (410 Gone) ---
  if (slug) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return NextResponse.next();
    }

    try {
      const apiUrl = new URL(`/api/posts/${encodeURIComponent(slug)}`, toInternalOrigin(request.nextUrl.origin));
      apiUrl.searchParams.set('__proxy', Date.now().toString());
      const apiResp = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
        cache: 'no-store',
      });

      if (apiResp.status === 410) {
        if (request.method === 'HEAD') {
          return new NextResponse(null, {
            status: 410,
            headers: {
              'Cache-Control': 'public, max-age=60',
              'X-Robots-Tag': 'noindex, nofollow',
            },
          });
        }

        return new NextResponse(renderGoneHtml(slug), {
          status: 410,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        });
      }

      return NextResponse.next();
    } catch {
      return NextResponse.next();
    }
  }

  // --- Handle /startup-events/:slug — 410 for draft events, and for slugs that no longer exist ---
  // A miss here is never a transient 404: events are renamed (which regenerates the slug and
  // orphans the old URL) or deleted outright, so the old URL is gone for good. Serving 410 +
  // noindex gets it dropped from search instead of being re-crawled for months as a soft 404,
  // and keeps these hits off the GA "Event not found" page-title bucket, since this response
  // carries no analytics script.
  const segments = pathname.split('/').filter(Boolean);
  if (pathname.startsWith('/startup-events/')) {
    const goneResponse = (label: string) => {
      if (request.method === 'HEAD') {
        return new NextResponse(null, {
          status: 410,
          headers: { 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'noindex, nofollow' },
        });
      }
      return new NextResponse(renderGoneHtml(label, 'event'), {
        status: 410,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    };

    // The route is a single dynamic segment, so anything deeper can never resolve to an event.
    // These are almost all scheme-less external URLs in the DB (e.g. `ecell.in/eureka`) that the
    // browser resolved relative to the detail page — see the Book Now / venue links.
    if (segments.length > 2) {
      return goneResponse(segments.slice(1).join('/'));
    }

    if (segments.length === 2) {
      const eventSlug = segments[1];
      const origin = toInternalOrigin(request.nextUrl.origin);
      try {
        const url = `${origin}/api/events/robots?slug=${encodeURIComponent(eventSlug)}`;
        const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
        if (res.ok) {
          const data = await res.json() as { httpStatus?: number };
          if (data?.httpStatus === 410) {
            return goneResponse(eventSlug);
          }
        }
      } catch { /* fail open — an unreachable API must not 410 a live event */ }
    }
  }

  // --- Handle post pages: /category/post-slug — 410 for drafts, X-Robots-Tag for others ---
  if (
    segments.length >= 2 &&
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/startup-events') &&
    !pathname.startsWith('/events') &&
    !pathname.startsWith('/dashboard')
  ) {
    const postSlug = segments[segments.length - 1];
    const categorySlug = segments[0];
    const origin = toInternalOrigin(request.nextUrl.origin);
    const { robots, httpStatus } = await getPostMeta(categorySlug, postSlug, origin);

    if (httpStatus === 410) {
      if (request.method === 'HEAD') {
        return new NextResponse(null, {
          status: 410,
          headers: { 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'noindex, nofollow' },
        });
      }
      return new NextResponse(renderGoneHtml(postSlug), {
        status: 410,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    if (robots && robots !== 'index,follow') {
      const response = NextResponse.next();
      response.headers.set('X-Robots-Tag', robots);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/post/:path*',
    '/((?!admin|api|_next/static|_next/image|images|favicon\.ico|robots\.txt|sitemap\.xml).*)',
  ],
};
