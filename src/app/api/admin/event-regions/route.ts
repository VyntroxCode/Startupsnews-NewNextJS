import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { EVENTS_ROLES } from '@/shared/middleware/roles';
import { EventRegionsRepository } from '@/modules/events/repository/event-regions.repository';
import { EventsRepository } from '@/modules/events/repository/events.repository';

const repo = new EventRegionsRepository();
const eventsRepo = new EventsRepository();

/**
 * GET /api/admin/event-regions
 * List all event regions, each with its event count
 */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [regions, counts] = await Promise.all([repo.findAll(), eventsRepo.countsByLocation()]);
    const regionsWithCounts = regions.map((region) => ({
      ...region,
      eventCount: counts[region.name] || 0,
    }));
    return NextResponse.json({ success: true, data: regionsWithCounts });
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
  const auth = await requireAnyRole(request, EVENTS_ROLES);
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
    const region = await repo.create(name, body.sort_order, auth.user.email);
    return NextResponse.json({ success: true, data: region }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/event-regions error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create region' }, { status: 500 });
  }
}
