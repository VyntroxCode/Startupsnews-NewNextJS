import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** GET /api/employee/leads/[source]/[id] — one assigned lead, read-only: everything the visitor
 * submitted, the people on it and every follow-up. 404 unless the caller is assigned to it.
 * Opening the lead is what marks the admin's messages to the caller as seen (the response still
 * flags them `unread` once, so the drawer can show them as new). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ source: string; id: string }> }) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { source, id } = await params;
    const detail = await service.getDetailForEmployee(source, id, auth.credential.id);
    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    return followUpErrorResponse(error, 'Failed to load the lead');
  }
}
