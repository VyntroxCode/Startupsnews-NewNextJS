import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_LEADS_PANEL_ROLES } from '@/shared/middleware/roles';
import { LeadAssignmentsRepository } from '@/modules/lead-assignments/repository/lead-assignments.repository';
import { LeadAssignmentsService } from '@/modules/lead-assignments/service/lead-assignments.service';
import { hrCredentialsService } from '../attendance/_lib';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { employeeLeadErrorResponse, employeeLeadsService } from '@/modules/sales-tracker/service/http';

const service = new LeadAssignmentsService(new LeadAssignmentsRepository());

/** GET /api/admin/my-leads — the Sales Tracker leads assigned to the calling Event / Publisher Admin.
 * Assignments store an HR login id, so the caller's panel_admins id is first mapped to the HR login
 * linked to it (hr_employee_credentials.linked_panel_admin_id), the same way /api/admin/attendance
 * finds them. The role guard means auth.user.id is always a panel_admins id here. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_LEADS_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) return NextResponse.json({ success: true, linked: false, data: [] });
    const leads = await service.getForEmployee(credential.id);
    return NextResponse.json({ success: true, linked: true, data: leads });
  } catch (error) {
    console.error('Error fetching assigned leads for panel admin:', error);
    return NextResponse.json({ success: false, error: 'Failed to load your leads' }, { status: 500 });
  }
}

/** POST /api/admin/my-leads — an Event / Publisher Admin adds a lead from My Leads (see
 * /api/employee/leads POST), as the HR login linked to their admin account. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_LEADS_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) return NextResponse.json({ success: false, error: 'Your account is not linked to an HR login, so you cannot add leads. Ask HR to link it.' }, { status: 400 });
    const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
    if (errorResponse) return errorResponse;
    const id = await employeeLeadsService.createByEmployee(body || {}, { id: credential.id, name: credential.name });
    return NextResponse.json({ success: true, data: { source: 'lead', leadId: id } }, { status: 201 });
  } catch (error) {
    return employeeLeadErrorResponse(error, "Couldn't save the lead");
  }
}
