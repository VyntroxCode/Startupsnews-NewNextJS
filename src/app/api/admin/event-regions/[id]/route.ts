import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { EventRegionsRepository } from '@/modules/events/repository/event-regions.repository';

const repo = new EventRegionsRepository();

/**
 * PUT /api/admin/event-regions/[id]
 * Update an event region name or sort_order
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const regionId = parseInt(id);
  if (isNaN(regionId)) {
    return NextResponse.json({ success: false, error: 'Invalid region ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: { name?: string; sort_order?: number } = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ success: false, error: 'Region name cannot be empty' }, { status: 400 });
      }
      if (await repo.nameExists(name, regionId)) {
        return NextResponse.json({ success: false, error: 'Region name already exists' }, { status: 409 });
      }
      updates.name = name;
    }

    if (body.sort_order !== undefined) {
      updates.sort_order = Number(body.sort_order);
    }

    const region = await repo.update(regionId, updates);
    return NextResponse.json({ success: true, data: region });
  } catch (err) {
    console.error('PUT /api/admin/event-regions/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update region' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/event-regions/[id]
 * Delete an event region
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const regionId = parseInt(id);
  if (isNaN(regionId)) {
    return NextResponse.json({ success: false, error: 'Invalid region ID' }, { status: 400 });
  }

  try {
    const existing = await repo.findById(regionId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Region not found' }, { status: 404 });
    }
    await repo.delete(regionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/event-regions/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete region' }, { status: 500 });
  }
}
