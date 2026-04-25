import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { getQueue } from '@/queue/queue.memory';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const queue = getQueue();
    const stats = await queue.getStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch queue status' },
      { status: 500 }
    );
  }
}
