import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { hrToolService } from '../_lib';

/** GET /api/admin/hr-tool/attendance-ledger?employeeId=E-101&month=YYYY-MM — one employee's pay
 * cycle day by day, with the totals and gross the payslip uses (HrToolService.getEmployeeCycleLedger).
 * `month` is the cycle's end month; omitted, today's cycle. Powers the HR attendance calendar. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const employeeId = request.nextUrl.searchParams.get('employeeId') || '';
    if (!employeeId) return NextResponse.json({ success: false, error: 'employeeId is required' }, { status: 400 });
    const data = await hrToolService.getEmployeeCycleLedger(employeeId, request.nextUrl.searchParams.get('month'));
    if (!data) return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error building attendance ledger:', error);
    return NextResponse.json({ success: false, error: 'Failed to load attendance' }, { status: 500 });
  }
}
