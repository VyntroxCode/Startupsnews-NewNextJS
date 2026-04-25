import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query } from '@/shared/database/connection';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';

const repo = new RssFeedsRepository();

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const feeds = await repo.findAll();
    const categoryIds = [...new Set(feeds.map((f) => f.category_id))];
    const categoryNames: Record<number, string> = {};
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => '?').join(',');
      const rows = await query<{ id: number; name: string }>(
        `SELECT id, name FROM categories WHERE id IN (${placeholders})`,
        categoryIds
      );
      rows.forEach((r) => { categoryNames[r.id] = r.name; });
    }
    const data = feeds.map((f) => ({
      ...f,
      category_name: categoryNames[f.category_id] ?? '—',
    }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch RSS feeds' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const feed = await repo.create({
      name: body.name,
      url: body.url,
      category_id: body.categoryId,
      author_id: body.authorId,
      enabled: body.enabled !== false ? 1 : 0,
      fetch_interval_minutes: body.fetchIntervalMinutes ?? 10,
      max_items_per_fetch: body.maxItemsPerFetch ?? 10,
      auto_publish: body.autoPublish !== false ? 1 : 0,
    });
    return NextResponse.json({ success: true, data: feed });
  } catch (error) {
    console.error('Error creating RSS feed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create RSS feed' },
      { status: 500 }
    );
  }
}
