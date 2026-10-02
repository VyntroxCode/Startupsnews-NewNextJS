import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrToolService } from '@/modules/hr-tool/service/hr-tool.service';
import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';

const hrToolService = new HrToolService(new HrToolRepository());

interface Body { employeeId?: string; date?: string; reason?: string; punchType?: 'in' | 'out'; requestedTime?: string }

/**
 * POST /api/admin/hr-tool/regularizations — files a regularization from inside HR Management,
 * through the SAME validation the employee portal uses (time windows, 5-day window, cycle
 * closing, per-cycle day limit, duplicate and on-time-punch checks). There is no whole-list PUT
 * any more: a regularization is created only here and decided only via ./decide.
 *
 * Separate from /api/admin/attendance/regularizations because that route derives the employee
 * from the caller's linked panel-admin credential, which a super-admin working in the HR tool
 * may not have. Here the employee is named explicitly — safe because HR_TOOL_ROLES is
 * super-admin only, i.e. exactly the people already allowed to edit anyone's attendance.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Body>(request);
    if (errorResponse) return errorResponse;
    if (!body?.employeeId || !body?.date || !body?.reason || !body?.requestedTime || (body.punchType !== 'in' && body.punchType !== 'out')) {
      return NextResponse.json({ success: false, error: 'employeeId, date, reason, punchType and requestedTime are required' }, { status: 400 });
    }
    const employee = await hrToolService.findEmployeeRef(body.employeeId);
    if (!employee) return NextResponse.json({ success: false, error: 'employeeId must be an existing Directory employee' }, { status: 400 });

    const result = await hrToolService.submitEmployeeRegularization(
      employee, body.date, body.reason, body.punchType, body.requestedTime
    );
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: result.created });
  } catch (error) {
    console.error('Error submitting HR-tool regularization:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit regularization request' }, { status: 500 });
  }
}
