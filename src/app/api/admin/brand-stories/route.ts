import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { BRAND_STORIES_ROLES } from '@/shared/middleware/roles';
import { BrandStoriesRepository } from '@/modules/brand-stories/repository/brand-stories.repository';

const repo = new BrandStoriesRepository();

function normalizeBody(body: Record<string, unknown>) {
  return {
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    fileUrl: String(body.fileUrl || '').trim(),
    thumbnailUrl: String(body.thumbnailUrl || '').trim() || null,
    fileName: String(body.fileName || '').trim() || null,
    fileSize: body.fileSize == null || body.fileSize === '' ? null : Number(body.fileSize),
    pageCount: body.pageCount == null || body.pageCount === '' ? null : Number(body.pageCount),
    mimeType: String(body.mimeType || '').trim() || null,
    isActive: body.isActive !== false,
    publishAt: body.publishAt ? String(body.publishAt).trim() || null : null,
    sectionId: body.sectionId == null || body.sectionId === '' ? null : Number(body.sectionId),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, BRAND_STORIES_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    // Auto-publish any scheduled brand stories whose time has passed on every page load
    await repo.publishDue().catch(() => {});
    const stories = await repo.findAll();
    return NextResponse.json({ success: true, data: stories });
  } catch (err) {
    console.error('GET /api/admin/brand-stories error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch brand stories', details: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, BRAND_STORIES_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = normalizeBody(await request.json());
    if (!body.title || !body.description || !body.fileUrl) {
      return NextResponse.json({ success: false, error: 'Title, description, and file are required' }, { status: 400 });
    }

    const story = await repo.create({ ...body, createdBy: auth.user.email });
    return NextResponse.json({ success: true, data: story }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/brand-stories error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create brand story' }, { status: 500 });
  }
}
