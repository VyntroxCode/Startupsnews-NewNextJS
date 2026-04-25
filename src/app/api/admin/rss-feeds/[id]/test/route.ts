import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { RssFeedsRepository } from '@/modules/rss-feeds/repository/rss-feeds.repository';
import { RssParserService } from '@/modules/rss-feeds/service/rss-parser.service';

const repo = new RssFeedsRepository();
const parser = new RssParserService();

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const feedId = parseInt(id, 10);
    if (isNaN(feedId)) return NextResponse.json({ success: false, error: 'Invalid feed ID' }, { status: 400 });
    const feed = await repo.findById(feedId);
    if (!feed) return NextResponse.json({ success: false, error: 'Feed not found' }, { status: 404 });
    if (!feed.enabled) {
      return NextResponse.json(
        { success: false, error: 'Feed is disabled. Enable the feed to run the test.' },
        { status: 400 }
      );
    }
    const { items } = await parser.fetchAndParse(feed.url);
    return NextResponse.json({
      success: true,
      data: { valid: true, itemCount: items.length, url: feed.url },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: true,
      data: { valid: false, error: message, itemCount: 0 },
    });
  }
}
