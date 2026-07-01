import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { ReportSectionsRepository } from '@/modules/reports/repository/report-sections.repository';

const repo = new ReportSectionsRepository();

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const sectionId = Number(id);
  if (Number.isNaN(sectionId)) {
    return NextResponse.json({ success: false, error: 'Invalid section ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const existing = await repo.findById(sectionId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }

    const section = await repo.update(sectionId, { title, sortOrder: Number(body.sortOrder ?? existing.sort_order) });
    return NextResponse.json({ success: true, data: section });
  } catch (err) {
    console.error('PUT /api/admin/report-sections/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update section' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const sectionId = Number(id);
  if (Number.isNaN(sectionId)) {
    return NextResponse.json({ success: false, error: 'Invalid section ID' }, { status: 400 });
  }

  try {
    const existing = await repo.findById(sectionId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Section not found' }, { status: 404 });
    }

    await repo.delete(sectionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/report-sections/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete section' }, { status: 500 });
  }
}
