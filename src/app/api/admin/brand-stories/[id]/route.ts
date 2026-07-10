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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, BRAND_STORIES_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const storyId = Number(id);
  if (Number.isNaN(storyId)) {
    return NextResponse.json({ success: false, error: 'Invalid brand story ID' }, { status: 400 });
  }

  try {
    const story = await repo.findById(storyId);
    if (!story) {
      return NextResponse.json({ success: false, error: 'Brand story not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: story });
  } catch (err) {
    console.error('GET /api/admin/brand-stories/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch brand story' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, BRAND_STORIES_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const storyId = Number(id);
  if (Number.isNaN(storyId)) {
    return NextResponse.json({ success: false, error: 'Invalid brand story ID' }, { status: 400 });
  }

  try {
    const body = normalizeBody(await request.json());
    if (!body.title || !body.description || !body.fileUrl) {
      return NextResponse.json({ success: false, error: 'Title, description, and file are required' }, { status: 400 });
    }

    const existing = await repo.findById(storyId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Brand story not found' }, { status: 404 });
    }

    const story = await repo.update(storyId, { ...body, updatedBy: auth.user.email });
    return NextResponse.json({ success: true, data: story });
  } catch (err) {
    console.error('PUT /api/admin/brand-stories/[id] error:', err);
    return NextResponse.json({ success: false, error: (err as Error).message || 'Failed to update brand story' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, BRAND_STORIES_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const storyId = Number(id);
  if (Number.isNaN(storyId)) {
    return NextResponse.json({ success: false, error: 'Invalid brand story ID' }, { status: 400 });
  }

  try {
    const existing = await repo.findById(storyId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Brand story not found' }, { status: 404 });
    }

    await repo.delete(storyId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/brand-stories/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete brand story' }, { status: 500 });
  }
}
