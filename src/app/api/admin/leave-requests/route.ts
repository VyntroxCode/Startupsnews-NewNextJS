import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrCredentialsService, hrToolService, LEAVE_ROLES } from './_lib';

interface LeaveRequestBody { type?: string; from?: string; to?: string; reason?: string; }

/** GET /api/admin/leave-requests — the caller's own leave requests + the admin-configured leave
 * types, for the Publisher/Event Admin dashboard's Leave widget.
 * POST /api/admin/leave-requests — { type, from, to, reason }. Only future dates (from tomorrow
 * onward) are eligible — see HrToolService.submitEmployeeLeaveRequest. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, LEAVE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json({ success: true, data: { linked: false, leaveRequests: [], leaveTypes: {}, leaveBalance: {} } } as const);
    }

    const [leaveRequests, policy, leaveBalance] = await Promise.all([
      hrToolService.getLeaveRequestsForEmployee(credential.name),
      hrToolService.getPolicySummary(),
      hrToolService.getLeaveBalancesForEmployee(credential.name),
    ]);
    return NextResponse.json({ success: true, data: { linked: true, leaveRequests, leaveTypes: policy.leaveTypes, leaveBalance } });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch leave requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, LEAVE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<LeaveRequestBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.type || !body?.from || !body?.to || !body?.reason) {
      return NextResponse.json({ success: false, error: 'type, from, to, and reason are required' }, { status: 400 });
    }

    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'No Employee ID has been assigned to your account yet — ask your Founder to assign one under HR Management → Assigning IDs.' },
        { status: 400 }
      );
    }

    const result = await hrToolService.submitEmployeeLeaveRequest(credential.name, body.type, body.from, body.to, body.reason);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error submitting leave request:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit leave request' },
      { status: 500 }
    );
  }
}
