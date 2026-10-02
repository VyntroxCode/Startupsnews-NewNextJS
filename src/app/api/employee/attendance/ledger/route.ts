import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService } from '../_lib';

/** GET /api/employee/attendance/ledger?month=YYYY-MM — the logged-in employee's own pay cycle day
 * by day, with the same totals payroll pays by (HrToolService.getEmployeeCycleLedger). Days and
 * totals only — salary figures stay in the payslip. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
    const employee = await hrToolService.resolveEmployeeForCredential(credential.id, credential.name);
    if (!employee) return NextResponse.json({ success: true, data: null });
    const ledger = await hrToolService.getEmployeeCycleLedger(employee.id, request.nextUrl.searchParams.get('month'));
    if (!ledger) return NextResponse.json({ success: true, data: null });
    const { month, periodFrom, periodTo, doj, days, totals, leave, locked } = ledger;
    return NextResponse.json({ success: true, data: { month, periodFrom, periodTo, doj, days, totals, leave, locked } });
  } catch (error) {
    console.error('Error building own attendance ledger:', error);
    return NextResponse.json({ success: false, error: 'Failed to load attendance' }, { status: 500 });
  }
}
