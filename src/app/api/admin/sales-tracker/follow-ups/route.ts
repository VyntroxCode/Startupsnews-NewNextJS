import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** GET /api/admin/sales-tracker/follow-ups?source=lead|ens&leadId=… — the follow-ups the assigned
 * employees logged on one lead, and each person's current status. Read-only: admins don't add or
 * edit follow-ups. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const source = request.nextUrl.searchParams.get('source');
    const leadId = request.nextUrl.searchParams.get('leadId') || '';
    const data = await service.getForAdmin(source, leadId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return followUpErrorResponse(error, 'Failed to load follow-ups');
  }
}
