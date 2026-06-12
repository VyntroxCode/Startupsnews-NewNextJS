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

// Lightweight in-process cache for robots + httpStatus (5 min TTL)
const robotsCache = new Map<string, { robots: string; httpStatus: number; expiresAt: number }>();
const ROBOTS_TTL_MS = 5 * 60 * 1000;

async function getPostMeta(slug: string, origin: string): Promise<{ robots: string; httpStatus: number }> {
  const now = Date.now();
  const cached = robotsCache.get(slug);
  if (cached && cached.expiresAt > now) return { robots: cached.robots, httpStatus: cached.httpStatus };
  try {
    const url = `${toInternalOrigin(origin)}/api/posts/robots?slug=${encodeURIComponent(slug)}`;
    const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return { robots: 'index,follow', httpStatus: 200 };
    const data = await res.json() as { robots?: string; httpStatus?: number };
    const robots = data?.robots || 'index,follow';
    const httpStatus = data?.httpStatus || 200;
    robotsCache.set(slug, { robots, httpStatus, expiresAt: now + ROBOTS_TTL_MS });
    return { robots, httpStatus };
  } catch {
    return { robots: 'index,follow', httpStatus: 200 };
  }
}

function renderGoneHtml(slug: string): string {
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
  <title>410 - Post Removed</title>
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
      <h2>This post is no longer available</h2>
      <p>The requested article has been intentionally removed and is no longer accessible.</p>
      <p class="slug">Slug: ${safeSlug}</p>
    </section>
  </main>
</body>
</html>`;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
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

  // --- Handle /startup-events/:slug — 410 for draft events ---
  const segments = pathname.split('/').filter(Boolean);
  if (pathname.startsWith('/startup-events/') && segments.length === 2) {
    const eventSlug = segments[1];
    const origin = toInternalOrigin(request.nextUrl.origin);
    try {
      const url = `${origin}/api/events/robots?slug=${encodeURIComponent(eventSlug)}`;
      const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json() as { httpStatus?: number };
        if (data?.httpStatus === 410) {
          if (request.method === 'HEAD') {
            return new NextResponse(null, {
              status: 410,
              headers: { 'Cache-Control': 'public, max-age=60', 'X-Robots-Tag': 'noindex, nofollow' },
            });
          }
          return new NextResponse(renderGoneHtml(eventSlug), {
            status: 410,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=60',
              'X-Robots-Tag': 'noindex, nofollow',
            },
          });
        }
      }
    } catch { /* fall through */ }
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
    const origin = toInternalOrigin(request.nextUrl.origin);
    const { robots, httpStatus } = await getPostMeta(postSlug, origin);

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
