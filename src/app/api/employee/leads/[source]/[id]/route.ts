import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { LeadFollowUpsService } from '@/modules/lead-followups/service/lead-followups.service';
import { followUpErrorResponse } from '@/modules/lead-followups/service/http';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { employeeLeadErrorResponse, employeeLeadsService } from '@/modules/sales-tracker/service/http';

const service = new LeadFollowUpsService(new LeadFollowUpsRepository());

/** GET /api/employee/leads/[source]/[id] — one lead: everything the visitor submitted, the people
 * on it and every follow-up. 404 unless the caller is assigned to it or created it; the creator
 * also gets `editable`, what their edit window starts from.
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

/** PUT /api/employee/leads/lead/[id] — the employee edits a lead they created (see
 * SalesTrackerService.updateByEmployee). 404 for any other lead. Returns the refreshed lead view. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ source: string; id: string }> }) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { source, id } = await params;
    if (source !== 'lead') return NextResponse.json({ success: false, error: 'You can only edit leads you created.' }, { status: 404 });
    const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
    if (errorResponse) return errorResponse;
    await employeeLeadsService.updateByEmployee(id, body || {}, { id: auth.credential.id, name: auth.credential.name });
    const detail = await service.getDetailForEmployee(source, id, auth.credential.id);
    return NextResponse.json({ success: true, data: detail });
  } catch (error) {
    return employeeLeadErrorResponse(error, "Couldn't save the lead");
  }
}
