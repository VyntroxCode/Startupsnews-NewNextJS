import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { LeadAssignmentsRepository } from '@/modules/lead-assignments/repository/lead-assignments.repository';
import { LeadAssignmentsService } from '@/modules/lead-assignments/service/lead-assignments.service';

const service = new LeadAssignmentsService(new LeadAssignmentsRepository());

/** GET /api/employee/leads — the Sales Tracker leads assigned to the logged-in employee. Matched by
 * their login id (hr_employee_credentials.id), which is what an assignment stores. */
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
