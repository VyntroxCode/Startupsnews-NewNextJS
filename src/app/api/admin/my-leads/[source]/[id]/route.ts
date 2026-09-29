import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_LEADS_PANEL_ROLES } from '@/shared/middleware/roles';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';
import { hrCredentialsService } from '../../../attendance/_lib';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** GET /api/admin/my-leads/[source]/[id] — the employee lead view (see
 * /api/employee/leads/[source]/[id]) for an Event / Publisher Admin, through the HR login linked to
 * their admin account (same mapping as /api/admin/my-leads). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ source: string; id: string }> }) {
  const auth = await requireAnyRole(request, MY_LEADS_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) return NextResponse.json({ success: false, error: 'Your account is not linked to an HR login.' }, { status: 404 });
    const { source, id } = await params;
    const detail = await service.getDetailForEmployee(source, id, credential.id);
    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    return followUpErrorResponse(error, 'Failed to load the lead');
  }
}
