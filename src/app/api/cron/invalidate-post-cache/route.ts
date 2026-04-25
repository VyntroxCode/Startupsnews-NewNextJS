import { NextRequest, NextResponse } from 'next/server';
import { invalidatePostsListCache } from '@/shared/cache/redis.client';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/invalidate-post-cache?secret=...
 * Clears Redis post list cache so home/category/search use fresh DB data (e.g. after changing thumbnail/Unsplash filter).
 * Secure with CRON_SECRET in .env.local.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await invalidatePostsListCache();
    return NextResponse.json({ success: true, message: 'Post list cache invalidated.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Invalidate post cache error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
