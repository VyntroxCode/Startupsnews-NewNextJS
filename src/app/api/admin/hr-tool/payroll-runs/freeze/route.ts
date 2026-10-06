import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService, getPayrollRoster, getEmployeeCodes } from '../../_lib';

/** POST /api/admin/hr-tool/payroll-runs/freeze — { month }. Makes a drafted month final and
 * publishes its payslips to employees (HrToolService.freezePayroll). Refused (409) with the
 * reasons while anything is pending, the draft is out of date, a CTC is missing, or an earlier
 * drafted month isn't frozen yet. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<{ month?: string }>(request);
    if (errorResponse) return errorResponse;
    if (!body?.month || !/^\d{4}-\d{2}$/.test(body.month)) return NextResponse.json({ success: false, error: 'month is required' }, { status: 400 });
    const [roster, codes] = await Promise.all([getPayrollRoster(), getEmployeeCodes()]);
    const result = await hrToolService.freezePayroll(body.month, roster, codes, auth.user.email);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error freezing payroll:', error);
    return NextResponse.json({ success: false, error: 'Failed to freeze payroll' }, { status: 500 });
  }
}
