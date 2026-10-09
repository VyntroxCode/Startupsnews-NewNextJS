import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_LEADS_PANEL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';
import { hrCredentialsService } from '../../../../attendance/_lib';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** POST /api/admin/my-leads/[source]/[id]/replies { followUpId, message } — as the employee route,
 * for an Event / Publisher Admin through their linked HR login. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ source: string; id: string }> }) {
  const auth = await requireAnyRole(request, MY_LEADS_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) return NextResponse.json({ success: false, error: 'Your account is not linked to an HR login.' }, { status: 404 });
    const { source, id } = await params;
    const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
    if (errorResponse) return errorResponse;
    const detail = await service.addReplyForEmployee(source, id, { id: credential.id, name: credential.name }, body || {});
    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    return followUpErrorResponse(error, "Couldn't save the reply");
  }
}
