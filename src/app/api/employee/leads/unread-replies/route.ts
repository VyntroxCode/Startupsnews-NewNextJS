import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** GET /api/employee/leads/unread-replies — admin replies on the caller's assigned leads that they
 * haven't seen yet, newest first. Polled by NewLeadReplyToast. Reading this does not mark anything
 * seen — opening the lead does. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await service.getUnreadRepliesForEmployee(auth.credential.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return followUpErrorResponse(error, 'Failed to load new replies');
  }
}
