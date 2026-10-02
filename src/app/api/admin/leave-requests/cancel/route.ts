import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import { refreshPayrollForDates } from '@/app/api/admin/hr-tool/_lib';
import { hrCredentialsService, hrToolService, LEAVE_ROLES } from '../_lib';

/** POST /api/admin/leave-requests/cancel — { id }. Publisher/Event Admin twin of the employee
 * route: withdraws the caller's own pending request at any time, or an approved one before it starts. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, LEAVE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<{ id?: string }>(request);
    if (errorResponse) return errorResponse;
    if (!body?.id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });

    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    const employee = credential ? await hrToolService.resolveEmployeeForCredential(credential.id, credential.name) : null;
    if (!employee) return NextResponse.json({ success: false, error: NO_DIRECTORY_RECORD_ERROR }, { status: 400 });

    const result = await hrToolService.cancelLeaveRequest(body.id, { kind: 'employee', employeeId: employee.id });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    // Same as HR's cancel/decide routes: an already-run, unlocked payroll cycle follows the change.
    if (result.updated) await refreshPayrollForDates([result.updated.from, result.updated.to]);
    return NextResponse.json({ success: true, data: result.updated });
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel the leave request' }, { status: 500 });
  }
}
