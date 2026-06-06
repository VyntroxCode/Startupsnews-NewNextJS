import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { EventRegionsRepository } from '@/modules/events/repository/event-regions.repository';

const repo = new EventRegionsRepository();

/**
 * GET /api/admin/event-regions
 * List all event regions ordered by sort_order
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const regions = await repo.findAll();
    return NextResponse.json({ success: true, data: regions });
  } catch (err) {
    console.error('GET /api/admin/event-regions error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch regions' }, { status: 500 });
  }
}

/**
 * POST /api/admin/event-regions
 * Create a new event region
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Region name is required' }, { status: 400 });
    }
    if (await repo.nameExists(name)) {
      return NextResponse.json({ success: false, error: 'Region name already exists' }, { status: 409 });
    }
    const region = await repo.create(name, body.sort_order);
    return NextResponse.json({ success: true, data: region }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/event-regions error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create region' }, { status: 500 });
  }
}
