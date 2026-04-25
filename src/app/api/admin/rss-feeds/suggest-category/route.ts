import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { queryOne } from '@/shared/database/connection';
import { mapFeedToCategorySlug } from '@/modules/rss-feeds/utils/feed-category-mapping';

/**
 * GET /api/admin/rss-feeds/suggest-category?name=...&url=...
 * Returns suggested category slug and id for RSS feed create/edit.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const name = request.nextUrl.searchParams.get('name') ?? '';
  const url = request.nextUrl.searchParams.get('url') ?? '';
  const slug = mapFeedToCategorySlug(name, url);

  const row = await queryOne<{ id: number; name: string }>(
    'SELECT id, name FROM categories WHERE slug = ? LIMIT 1',
    [slug]
  );
  if (!row) {
    return NextResponse.json({
      success: true,
      data: { slug, categoryId: null, categoryName: null },
    });
  }
  return NextResponse.json({
    success: true,
    data: { slug, categoryId: row.id, categoryName: row.name },
  });
}
