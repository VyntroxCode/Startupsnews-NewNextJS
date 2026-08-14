import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { EVENTS_ROLES } from '@/shared/middleware/roles';
import { PartnershipEventsService } from '@/modules/partnership-events/service/partnership-events.service';
import { PartnershipEventsRepository } from '@/modules/partnership-events/repository/partnership-events.repository';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { PartnershipEventInput } from '@/modules/partnership-events/domain/types';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';

const partnershipEventsRepository = new PartnershipEventsRepository();
const partnershipEventsService = new PartnershipEventsService(partnershipEventsRepository, new EventsService(new EventsRepository()));

export const maxDuration = 900;

interface ImportBody {
  rows: PartnershipEventInput[];
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<ImportBody>(request);
    if (errorResponse) return errorResponse;
    if (!body || !Array.isArray(body.rows) || !body.rows.length) {
      return NextResponse.json({ success: false, error: 'rows array is required' }, { status: 400 });
    }
    if (body.rows.length > 50000) {
      return NextResponse.json({ success: false, error: 'Import is limited to 50000 rows at a time' }, { status: 400 });
    }

    const result = await partnershipEventsService.importEvents(body.rows, auth.user.email);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error importing partnership events:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
