import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { RssFeedWorker } from '@/workers/rss.worker';

const worker = new RssFeedWorker();

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const feedId = parseInt(id, 10);
    if (isNaN(feedId)) return NextResponse.json({ success: false, error: 'Invalid feed ID' }, { status: 400 });
    const result = await worker.processFeedManually(feedId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error running manual fetch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Manual fetch failed' },
      { status: 500 }
    );
  }
}
