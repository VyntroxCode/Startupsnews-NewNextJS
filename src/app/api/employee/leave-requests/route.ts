import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from './_lib';

interface LeaveRequestBody { type?: string; from?: string; to?: string; reason?: string; }

/** GET /api/employee/leave-requests — the caller's own leave requests + the admin-configured
 * leave types, for the employee-facing Leave widget.
 * POST /api/employee/leave-requests — { type, from, to, reason }. Only future dates (from
 * tomorrow onward) are eligible — see HrToolService.submitEmployeeLeaveRequest. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [leaveRequests, policy, leaveBalance] = await Promise.all([
      hrToolService.getLeaveRequestsForEmployee(auth.credential.name),
      hrToolService.getPolicySummary(),
      hrToolService.getLeaveBalancesForEmployee(auth.credential.name),
    ]);
    return NextResponse.json({ success: true, data: { leaveRequests, leaveTypes: policy.leaveTypes, leaveBalance } });
  } catch (error) {
    console.error('Error fetching employee leave requests:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<LeaveRequestBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.type || !body?.from || !body?.to || !body?.reason) {
      return NextResponse.json({ success: false, error: 'type, from, to, and reason are required' }, { status: 400 });
    }

    const result = await hrToolService.submitEmployeeLeaveRequest(auth.credential.name, body.type, body.from, body.to, body.reason);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error submitting employee leave request:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit leave request' },
      { status: 500 }
    );
  }
}
