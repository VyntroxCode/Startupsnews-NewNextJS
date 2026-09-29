import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { LeadAssignmentsRepository } from '@/modules/lead-assignments/repository/lead-assignments.repository';
import { LeadAssignmentsService, LeadAssignmentValidationError } from '@/modules/lead-assignments/service/lead-assignments.service';
import { parseJsonBody } from '@/shared/utils/parse-json-body';

const service = new LeadAssignmentsService(new LeadAssignmentsRepository());

/** GET — the employees and departments the lead window offers, plus every lead's current
 * departments and people. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [employees, assignments] = await Promise.all([service.getAssignableEmployees(), service.getAll()]);
    const departments = await service.getDepartments(employees);
    return NextResponse.json({ success: true, data: { employees, departments, assignments } });
  } catch (error) {
    console.error('Error fetching lead assignments:', error);
    return NextResponse.json({ success: false, error: 'Failed to load lead assignments' }, { status: 500 });
  }
}

/** PUT { source: 'lead' | 'ens', leadId, departments: string[],
 *        assignees: { credentialId: number, viaDepartment: string | null }[] }
 * — sets the lead's departments and people to exactly these (see LeadAssignmentsService.setForLead).
 * Empty lists unassign the lead. Returns the stored LeadAssignment. */
export async function PUT(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Record<string, unknown>>(request);
    if (errorResponse) return errorResponse;
    const assignedBy = auth.user.name || auth.user.email || '';
    const assignment = await service.setForLead(body || {}, assignedBy);
    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    if (error instanceof LeadAssignmentValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error assigning lead:', error);
    return NextResponse.json({ success: false, error: "Couldn't save the assignment" }, { status: 500 });
  }
}
