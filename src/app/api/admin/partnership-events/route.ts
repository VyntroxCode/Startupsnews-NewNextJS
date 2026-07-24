import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { EVENTS_ROLES } from '@/shared/middleware/roles';
import { PartnershipEventsService } from '@/modules/partnership-events/service/partnership-events.service';
import { PartnershipEventsRepository } from '@/modules/partnership-events/repository/partnership-events.repository';
import { entityToPartnershipEvent } from '@/modules/partnership-events/utils/partnership-events.utils';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { PartnershipEventInput } from '@/modules/partnership-events/domain/types';

const partnershipEventsRepository = new PartnershipEventsRepository();
const partnershipEventsService = new PartnershipEventsService(partnershipEventsRepository);

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '2000'), 30000);
    const offset = (page - 1) * limit;

    const filters = { search, status };

    const [total, entities] = await Promise.all([
      partnershipEventsService.countEvents(filters),
      partnershipEventsService.getAllEvents({ ...filters, limit, offset }),
    ]);

    return NextResponse.json({
      success: true,
      data: entities.map(entityToPartnershipEvent),
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
    return NextResponse.json({ success: true, data: entityToPartnershipEvent(entity) }, { status: 201 });
  } catch (error) {
    console.error('Error creating partnership event:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create partnership event' },
      { status: 400 }
    );
  }
}
