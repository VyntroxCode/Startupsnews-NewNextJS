/**
 * GET /api/debug/latest-posts
 * Shows the top published posts as returned by "latest first" queries (by id DESC).
 * Use this to verify that new posts exist and ordering is correct.
 */
import { NextResponse } from 'next/server';
import { query } from '@/shared/database/connection';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await query<{
      id: number;
      title: string;
      status: string;
      created_at: string | Date;
      published_at: string | Date | null;
      featured_image_url: string | null;
      content: string | null;
    }>(
      `SELECT id, title, status, created_at, published_at, featured_image_url, content FROM posts
       WHERE status = 'published'
       ORDER BY id DESC
       LIMIT 10`
    );

    const now = new Date();
    const withDetails = rows.map((r) => {
      const d = r.published_at || r.created_at;
      // extract first img src from content
      const contentImgMatch = r.content ? r.content.match(/<img[^>]+src=["']([^"']+)["']/) : null;
      const contentImg = contentImgMatch ? contentImgMatch[1] : null;

      return {
        id: r.id,
        title: r.title?.slice(0, 60),
        published_at: d,
        featured_image_url: r.featured_image_url,
        first_content_image: contentImg,
      };
    });

    return NextResponse.json({
      ok: true,
      message: 'Top 10 published posts ordered by id DESC (what homepage uses)',
      count: rows.length,
      latest_posts: withDetails,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
