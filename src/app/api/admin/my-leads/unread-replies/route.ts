import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_LEADS_PANEL_ROLES } from '@/shared/middleware/roles';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';
import { hrCredentialsService } from '../../attendance/_lib';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** GET /api/admin/my-leads/unread-replies — the unseen-replies list (see
 * /api/employee/leads/unread-replies) for an Event / Publisher Admin, through the HR login linked
 * to their admin account. No link = nothing can be assigned to them, so an empty list. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_LEADS_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) return NextResponse.json({ success: true, data: { count: 0, items: [] } });
    const data = await service.getUnreadRepliesForEmployee(credential.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return followUpErrorResponse(error, 'Failed to load new replies');
  }
}
