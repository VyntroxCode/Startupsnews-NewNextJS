import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** POST { source: 'lead' | 'ens', leadId, followUpId, message } — an admin's reply under one entry
 * of a lead's history. Everyone assigned to the lead sees it in My Leads and gets it as a new
 * reply until they open the lead. Returns the refreshed history (as GET …/follow-ups). */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
    if (errorResponse) return errorResponse;
    const data = await service.addReplyForAdmin(body || {}, auth.user.name || auth.user.email || '');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return followUpErrorResponse(error, "Couldn't save the reply");
  }
}
