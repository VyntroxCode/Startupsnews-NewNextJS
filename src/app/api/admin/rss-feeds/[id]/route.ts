import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';

const repo = new RssFeedsRepository();

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const feedId = parseInt(id, 10);
    if (isNaN(feedId)) return NextResponse.json({ success: false, error: 'Invalid feed ID' }, { status: 400 });
    const feed = await repo.findById(feedId);
    if (!feed) return NextResponse.json({ success: false, error: 'Feed not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: feed });
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const feedId = parseInt(id, 10);
    if (isNaN(feedId)) return NextResponse.json({ success: false, error: 'Invalid feed ID' }, { status: 400 });
    const body = await request.json();
    const feed = await repo.update(feedId, {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.categoryId !== undefined && { category_id: body.categoryId }),
      ...(body.authorId !== undefined && { author_id: body.authorId }),
      ...(body.enabled !== undefined && { enabled: body.enabled ? 1 : 0 }),
      ...(body.fetchIntervalMinutes !== undefined && { fetch_interval_minutes: body.fetchIntervalMinutes }),
      ...(body.maxItemsPerFetch !== undefined && { max_items_per_fetch: body.maxItemsPerFetch }),
      ...(body.autoPublish !== undefined && { auto_publish: body.autoPublish ? 1 : 0 }),
    });
    return NextResponse.json({ success: true, data: feed });
  } catch (error) {
    console.error('Error updating RSS feed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update feed' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(_request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const feedId = parseInt(id, 10);
    if (isNaN(feedId)) return NextResponse.json({ success: false, error: 'Invalid feed ID' }, { status: 400 });
    await repo.delete(feedId);
    return NextResponse.json({ success: true, message: 'Feed deleted' });
  } catch (error) {
    console.error('Error deleting RSS feed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete feed' },
      { status: 500 }
    );
  }
}
