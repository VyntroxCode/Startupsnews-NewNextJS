import { NextRequest, NextResponse } from 'next/server';

function getSlugFromPath(pathname: string): string | null {
  const prefix = '/post/';
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).split('/')[0]?.trim();
  return slug || null;
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
      <h1>This post is no longer available</h1>
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

  if (!slug) return NextResponse.next();

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.next();
  }

  try {
    const apiUrl = new URL(`/api/posts/${encodeURIComponent(slug)}`, request.nextUrl.origin);
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

export const config = {
  matcher: ['/post/:path*'],
};
