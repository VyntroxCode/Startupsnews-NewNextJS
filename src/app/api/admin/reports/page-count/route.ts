import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { ReportsRepository } from '@/modules/reports/repository/reports.repository';
import { fetchPdfPageCount } from '@/modules/reports/utils/pdf-page-count';

const repo = new ReportsRepository();

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json() as { reportId?: number; fileUrl?: string; mimeType?: string | null };
    const reportId = Number(body.reportId || 0);
    const fileUrl = String(body.fileUrl || '').trim();
    const mimeType = String(body.mimeType || '').trim().toLowerCase();

    if (!reportId || !fileUrl) {
      return NextResponse.json({ success: false, error: 'reportId and fileUrl are required' }, { status: 400 });
    }

    const isPdf = mimeType === 'application/pdf' || fileUrl.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ success: true, data: { pageCount: null, skipped: true } });
    }

    const existing = await repo.findById(reportId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    const pageCount = await fetchPdfPageCount(fileUrl);

    const updated = await repo.update(reportId, {
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
    console.error('POST /api/admin/reports/page-count error:', err);
    return NextResponse.json({ success: false, error: 'Failed to calculate page count', details: (err as Error).message }, { status: 500 });
  }
}