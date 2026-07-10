import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { BRAND_STORIES_ROLES } from '@/shared/middleware/roles';
import { BrandStoriesRepository } from '@/modules/brand-stories/repository/brand-stories.repository';
import { fetchPdfPageCount } from '@/modules/reports/utils/pdf-page-count';

const repo = new BrandStoriesRepository();

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, BRAND_STORIES_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json() as { brandStoryId?: number; fileUrl?: string; mimeType?: string | null };
    const brandStoryId = Number(body.brandStoryId || 0);
    const fileUrl = String(body.fileUrl || '').trim();
    const mimeType = String(body.mimeType || '').trim().toLowerCase();

    if (!brandStoryId || !fileUrl) {
      return NextResponse.json({ success: false, error: 'brandStoryId and fileUrl are required' }, { status: 400 });
    }

    const isPdf = mimeType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ success: true, data: { pageCount: null, skipped: true } });
    }

    const existing = await repo.findById(brandStoryId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Brand story not found' }, { status: 404 });
    }

    const pageCount = await fetchPdfPageCount(fileUrl);

    const updated = await repo.update(brandStoryId, {
      title: existing.title,
      description: existing.description,
      fileUrl: existing.file_url,
      thumbnailUrl: existing.thumbnail_url,
      fileName: existing.file_name,
      fileSize: existing.file_size,
      pageCount,
      mimeType: existing.mime_type,
      isActive: existing.is_active === 1,
    });

    return NextResponse.json({ success: true, data: { pageCount: updated?.page_count ?? pageCount ?? null } });
  } catch (err) {
    console.error('POST /api/admin/brand-stories/page-count error:', err);
    return NextResponse.json({ success: false, error: 'Failed to calculate page count', details: (err as Error).message }, { status: 500 });
  }
}
