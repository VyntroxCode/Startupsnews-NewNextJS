import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { LeadAssignmentsRepository } from '@/modules/lead-assignments/repository/lead-assignments.repository';
import { LeadAssignmentsService } from '@/modules/lead-assignments/service/lead-assignments.service';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { employeeLeadErrorResponse, employeeLeadsService } from '@/modules/sales-tracker/service/http';

const service = new LeadAssignmentsService(new LeadAssignmentsRepository());

/** GET /api/employee/leads — the Sales Tracker leads assigned to the logged-in employee, plus the
 * ones they added themselves. Matched by their login id (hr_employee_credentials.id), which is what
 * an assignment — and a lead's creator — stores. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const leads = await service.getForEmployee(auth.credential.id);
    return NextResponse.json({ success: true, data: leads });
  } catch (error) {
    console.error('Error fetching assigned leads:', error);
    return NextResponse.json({ success: false, error: 'Failed to load your leads' }, { status: 500 });
  }
}

/** POST /api/employee/leads — the employee adds a lead from My Leads and assigns it (see
 * SalesTrackerService.createByEmployee for the body). They become the lead's creator, which lets
 * them open and edit it later. Returns the new lead's id. There is no delete for employees. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
    if (errorResponse) return errorResponse;
    const id = await employeeLeadsService.createByEmployee(body || {}, { id: auth.credential.id, name: auth.credential.name });
    return NextResponse.json({ success: true, data: { source: 'lead', leadId: id } }, { status: 201 });
  } catch (error) {
    return employeeLeadErrorResponse(error, "Couldn't save the lead");
  }
}
