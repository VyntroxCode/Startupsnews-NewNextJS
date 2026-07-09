import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { REPORTS_ROLES } from '@/shared/middleware/roles';
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
    sectionId: body.sectionId == null || body.sectionId === '' ? null : Number(body.sectionId),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, REPORTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const reportId = Number(id);
  if (Number.isNaN(reportId)) {
    return NextResponse.json({ success: false, error: 'Invalid report ID' }, { status: 400 });
  }

  try {
    const report = await repo.findById(reportId);
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    console.error('GET /api/admin/reports/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch report' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, REPORTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const reportId = Number(id);
  if (Number.isNaN(reportId)) {
    return NextResponse.json({ success: false, error: 'Invalid report ID' }, { status: 400 });
  }

  try {
    const body = normalizeBody(await request.json());
    if (!body.title || !body.description || !body.fileUrl) {
      return NextResponse.json({ success: false, error: 'Title, description, and file are required' }, { status: 400 });
    }

    const existing = await repo.findById(reportId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    const report = await repo.update(reportId, { ...body, updatedBy: auth.user.email });
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    console.error('PUT /api/admin/reports/[id] error:', err);
    return NextResponse.json({ success: false, error: (err as Error).message || 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, REPORTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const reportId = Number(id);
  if (Number.isNaN(reportId)) {
    return NextResponse.json({ success: false, error: 'Invalid report ID' }, { status: 400 });
  }

  try {
    const existing = await repo.findById(reportId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    await repo.delete(reportId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/reports/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete report' }, { status: 500 });
  }
}
