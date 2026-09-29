import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** POST /api/employee/leads/[source]/[id]/follow-ups { note, status } — logs a follow-up on a lead
 * assigned to the caller and sets their status on it. The date is the server's; none is accepted.
 * Returns the refreshed lead view. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ source: string; id: string }> }) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { source, id } = await params;
    const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
    if (errorResponse) return errorResponse;
    const detail = await service.addForEmployee(source, id, { id: auth.credential.id, name: auth.credential.name }, body || {});
    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    return followUpErrorResponse(error, "Couldn't save the follow-up");
  }
}
