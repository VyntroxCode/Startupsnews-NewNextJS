import { NextResponse } from 'next/server';
import { BrandStoriesRepository } from '@/modules/brand-stories/repository/brand-stories.repository';

const repo = new BrandStoriesRepository();

export async function GET() {
  try {
    await repo.publishDue().catch(() => {});
    const stories = await repo.findActive();
    return NextResponse.json({ success: true, data: stories });
  } catch (err) {
    console.error('GET /api/brand-stories error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch brand stories', details: (err as Error).message }, { status: 500 });
  }
}
