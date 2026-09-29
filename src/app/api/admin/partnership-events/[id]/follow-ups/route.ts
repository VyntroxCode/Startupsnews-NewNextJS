import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { EVENTS_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { PartnershipEventsRepository } from '@/modules/partnership-events/repository/partnership-events.repository';
import { PartnershipEventFollowUpsRepository } from '@/modules/partnership-events/repository/partnership-event-follow-ups.repository';
import { PartnershipEventFollowUpsService } from '@/modules/partnership-events/service/partnership-event-follow-ups.service';

/**
 * Follow Up notes on an Events Tracker record. GET lists them (newest first, at most 5);
 * POST { message } adds one and returns the updated list. There is deliberately no PUT/DELETE:
 * a note and its date can't be changed once added.
 */
const service = new PartnershipEventFollowUpsService(new PartnershipEventFollowUpsRepository(), new PartnershipEventsRepository());

function parseId(idParam: string): number | null {
  const id = parseInt(idParam, 10);
  return Number.isFinite(id) ? id : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const id = parseId((await params).id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid event id' }, { status: 400 });
    const data = await service.list(id);
    if (!data) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error loading follow ups:', error);
    return NextResponse.json({ success: false, error: 'Failed to load follow ups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const id = parseId((await params).id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid event id' }, { status: 400 });
    const [body, errorResponse] = await parseJsonBody<{ message?: unknown }>(request);
    if (errorResponse) return errorResponse;
    const data = await service.add(id, body?.message, auth.user.name || auth.user.email || '');
    if (!data) return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error adding follow up:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add follow up' },
      { status: 400 }
    );
  }
}
