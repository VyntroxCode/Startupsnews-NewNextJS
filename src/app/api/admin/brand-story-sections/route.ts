import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { BRAND_STORIES_ROLES } from '@/shared/middleware/roles';
import { BrandStorySectionsRepository } from '@/modules/brand-stories/repository/brand-story-sections.repository';

const repo = new BrandStorySectionsRepository();

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, BRAND_STORIES_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const sections = await repo.findAll();
    return NextResponse.json({ success: true, data: sections });
  } catch (err) {
    console.error('GET /api/admin/brand-story-sections error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch sections' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, BRAND_STORIES_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const section = await repo.create({ title, sortOrder: Number(body.sortOrder ?? 0), createdBy: auth.user.email });
    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/brand-story-sections error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create section' }, { status: 500 });
  }
}
