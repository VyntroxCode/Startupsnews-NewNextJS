import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/shared/database/connection';

/**
 * GET /api/posts/robots?slug=some-post-slug
 * Lightweight endpoint — returns only the robots directive for a post slug.
 * Used by middleware to set X-Robots-Tag without loading the full post entity.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim();
  if (!slug) {
    return NextResponse.json({ robots: 'index,nofollow' });
  }

  try {
    const row = await queryOne<{ robots: string | null; status: string; is_gone_410: number }>(
      `SELECT robots, status, is_gone_410 FROM posts WHERE slug = ? LIMIT 1`,
      [slug]
    );
    if (!row) return NextResponse.json({ robots: 'index,follow', httpStatus: 200 });
    const httpStatus = (Boolean(row.is_gone_410) || row.status !== 'published') ? 410 : 200;
    const robots = row.robots || (httpStatus === 410 ? 'noindex,nofollow' : 'index,follow');
    return NextResponse.json({ robots, httpStatus }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return NextResponse.json({ robots: 'index,follow', httpStatus: 200 });
  }
}
