import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { ReportsRepository } from '@/modules/reports/repository/reports.repository';

const repo = new ReportsRepository();

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
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    // Auto-publish any scheduled reports whose time has passed on every page load
    await repo.publishDue().catch(() => {});
    const reports = await repo.findAll();
    return NextResponse.json({ success: true, data: reports });
  } catch (err) {
    console.error('GET /api/admin/reports error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports', details: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = normalizeBody(await request.json());
    if (!body.title || !body.description || !body.fileUrl) {
      return NextResponse.json({ success: false, error: 'Title, description, and file are required' }, { status: 400 });
    }

    const report = await repo.create(body);
    return NextResponse.json({ success: true, data: report }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/reports error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create report' }, { status: 500 });
  }
}
