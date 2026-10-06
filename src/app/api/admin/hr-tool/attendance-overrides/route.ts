import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService, getPayrollRoster } from '../_lib';

interface SetBody { employeeId?: string; date?: string; status?: string; reason?: string }
interface ClearBody { employeeId?: string; date?: string }

/** POST /api/admin/hr-tool/attendance-overrides — { employeeId, date, status, reason }.
 * HR sets one day's status directly (HrToolService.setAttendanceOverride): payroll and both
 * calendars follow it, and a draft payslip for that cycle is recomputed at once. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<SetBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.employeeId || !body.date || !body.status) {
      return NextResponse.json({ success: false, error: 'employeeId, date and status are required' }, { status: 400 });
    }
    const roster = await getPayrollRoster();
    const result = await hrToolService.setAttendanceOverride(body.employeeId, body.date, body.status, body.reason || '', auth.user.email, roster);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: { override: result.override, closedRegularizations: result.closedRegularizations, draftUpdated: result.draftUpdated } });
  } catch (error) {
    console.error('Error setting HR attendance status:', error);
    return NextResponse.json({ success: false, error: 'Failed to save the attendance status' }, { status: 500 });
  }
}

/** DELETE /api/admin/hr-tool/attendance-overrides — { employeeId, date }. Removes the HR-set
 * status; the day is judged from punches and leave again. */
export async function DELETE(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<ClearBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.employeeId || !body.date) return NextResponse.json({ success: false, error: 'employeeId and date are required' }, { status: 400 });
    const roster = await getPayrollRoster();
    const result = await hrToolService.clearAttendanceOverride(body.employeeId, body.date, auth.user.email, roster);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: { draftUpdated: result.draftUpdated } });
  } catch (error) {
    console.error('Error removing HR attendance status:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove the attendance status' }, { status: 500 });
  }
}
