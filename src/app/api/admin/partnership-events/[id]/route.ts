import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { EVENTS_ROLES } from '@/shared/middleware/roles';
import { PartnershipEventsService } from '@/modules/partnership-events/service/partnership-events.service';
import { PartnershipEventsRepository } from '@/modules/partnership-events/repository/partnership-events.repository';
import { entityToPartnershipEvent } from '@/modules/partnership-events/utils/partnership-events.utils';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { PartnershipEventInput } from '@/modules/partnership-events/domain/types';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';

const partnershipEventsRepository = new PartnershipEventsRepository();
const eventsService = new EventsService(new EventsRepository());
const partnershipEventsService = new PartnershipEventsService(partnershipEventsRepository, eventsService);

function parseId(idParam: string): number | null {
  const id = parseInt(idParam, 10);
  return Number.isFinite(id) ? id : null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid event id' }, { status: 400 });

    const [body, errorResponse] = await parseJsonBody<Partial<PartnershipEventInput>>(request);
    if (errorResponse) return errorResponse;
    if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

    const entity = await partnershipEventsService.updateEvent(id, body, auth.user.email);
    if (!entity) return NextResponse.json({ success: false, error: 'Partnership event not found' }, { status: 404 });

    const linkedMap = await partnershipEventsService.getLinkedEventSummaries([entity]);
    const linkedEvent = entity.event_id ? linkedMap.get(entity.event_id) || null : null;

    return NextResponse.json({ success: true, data: { ...entityToPartnershipEvent(entity), linkedEvent } });
  } catch (error) {
    console.error('Error updating partnership event:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update partnership event' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid event id' }, { status: 400 });

    await partnershipEventsService.deleteEvent(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting partnership event:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete partnership event' },
      { status: 500 }
    );
  }
}
