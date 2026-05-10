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
    const row = await queryOne<{ robots: string | null }>(
      `SELECT robots FROM posts WHERE slug = ? AND status = 'published' LIMIT 1`,
      [slug]
    );
    const robots = row?.robots || 'index,nofollow';
    return NextResponse.json({ robots }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return NextResponse.json({ robots: 'index,nofollow' });
  }
}
