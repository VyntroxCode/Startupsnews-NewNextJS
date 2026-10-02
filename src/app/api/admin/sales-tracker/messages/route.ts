import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** GET /api/admin/sales-tracker/messages?source=lead|ens&leadId=… — the admin's messages to the
 * people assigned to one lead, newest first. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const source = request.nextUrl.searchParams.get('source');
    const leadId = request.nextUrl.searchParams.get('leadId') || '';
    const data = await service.getMessagesForAdmin(source, leadId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return followUpErrorResponse(error, 'Failed to load messages');
  }
}

/** POST { source: 'lead' | 'ens', leadId, message } — adds a message every assigned employee sees
 * in My Leads. The lead must have someone assigned. Returns the whole history, newest first. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
    if (errorResponse) return errorResponse;
    const data = await service.addMessageForAdmin(body || {}, auth.user.name || auth.user.email || '');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return followUpErrorResponse(error, "Couldn't save the message");
  }
}
