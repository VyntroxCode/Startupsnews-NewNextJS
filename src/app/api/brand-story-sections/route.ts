import { NextResponse } from 'next/server';
import { BrandStorySectionsRepository } from '@/modules/brand-stories/repository/brand-story-sections.repository';

const repo = new BrandStorySectionsRepository();

export async function GET() {
  try {
    const sections = await repo.findAll();
    return NextResponse.json({ success: true, data: sections });
  } catch (err) {
    console.error('GET /api/brand-story-sections error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch sections' }, { status: 500 });
  }
}
