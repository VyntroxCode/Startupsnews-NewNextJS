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
const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);
const partnershipEventsService = new PartnershipEventsService(partnershipEventsRepository, eventsService);

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    // Keep linked-event status in sync (same lazy refresh the Events admin list already does)
    // so "Completed" shows correctly here too, without a separate cron job.
    await eventsRepository.markPastEventsAsExpired();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '2000'), 50000);
    const offset = (page - 1) * limit;

    const filters = { search, status };

    const [total, entities] = await Promise.all([
      partnershipEventsService.countEvents(filters),
      partnershipEventsService.getAllEvents({ ...filters, limit, offset }),
    ]);

    const linkedMap = await partnershipEventsService.getLinkedEventSummaries(entities);
    const data = entities.map((e) => ({
      ...entityToPartnershipEvent(e),
      linkedEvent: e.event_id ? linkedMap.get(e.event_id) || null : null,
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching partnership events:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch partnership events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<PartnershipEventInput>(request);
    if (errorResponse) return errorResponse;
    if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

    const entity = await partnershipEventsService.createEvent({ ...body, source: body.source || 'Manually added' }, auth.user.email);
    const linkedMap = await partnershipEventsService.getLinkedEventSummaries([entity]);
    const linkedEvent = entity.event_id ? linkedMap.get(entity.event_id) || null : null;

    return NextResponse.json({ success: true, data: { ...entityToPartnershipEvent(entity), linkedEvent } }, { status: 201 });
  } catch (error) {
    console.error('Error creating partnership event:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create partnership event' },
      { status: 400 }
    );
  }
}
