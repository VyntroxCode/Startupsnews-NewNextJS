import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { EVENTS_ROLES } from '@/shared/middleware/roles';
import { PartnershipEventsService } from '@/modules/partnership-events/service/partnership-events.service';
import { PartnershipEventsRepository } from '@/modules/partnership-events/repository/partnership-events.repository';
import { parseJsonBody } from '@/shared/utils/parse-json-body';

const partnershipEventsRepository = new PartnershipEventsRepository();
const partnershipEventsService = new PartnershipEventsService(partnershipEventsRepository);

interface BulkBody {
  ids: number[];
  action: 'delete';
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, EVENTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<BulkBody>(request);
    if (errorResponse) return errorResponse;
    if (!body || !Array.isArray(body.ids) || !body.ids.length) {
      return NextResponse.json({ success: false, error: 'ids array is required' }, { status: 400 });
    }
    if (body.action !== 'delete') {
      return NextResponse.json({ success: false, error: 'Invalid bulk action' }, { status: 400 });
    }

    const ids = body.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    await partnershipEventsService.bulkDelete(ids);

    return NextResponse.json({ success: true, data: { count: ids.length } });
  } catch (error) {
    console.error('Error running bulk partnership event action:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Bulk action failed' },
      { status: 500 }
    );
  }
}
