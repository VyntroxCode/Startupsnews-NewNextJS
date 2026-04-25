import { NextRequest, NextResponse } from 'next/server';
import { RssFeedsService } from '@/modules/rss-feeds/service/rss-feeds.service';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/rss-feeds?secret=...
 * Run every 10 minutes to fetch RSS feeds and create posts (images uploaded to S3).
 * Secure with CRON_SECRET in .env.local.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const service = new RssFeedsService();
    const result = await service.processAllFeeds();
    return NextResponse.json({
      success: true,
      totalFeeds: result.totalFeeds,
      processed: result.processed,
      created: result.created,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('RSS cron error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
