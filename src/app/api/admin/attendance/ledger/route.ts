import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { summarizeCycleRegularizations } from '@/modules/hr-tool/utils/regularization-policy';
import { hrCredentialsService, hrToolService, ATTENDANCE_ROLES } from '../_lib';

/** GET /api/admin/attendance/ledger?month=YYYY-MM — the caller's own pay cycle day by day, with
 * the same totals payroll pays by (HrToolService.getEmployeeCycleLedger). Days and totals only —
 * salary figures stay in the payslip. Returns the same shape as /api/employee/attendance/ledger
 * (regularization counts, short-leave rule, payrollRun) — AttendanceCycleSummary reads them all. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, ATTENDANCE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    const employee = credential ? await hrToolService.resolveEmployeeForCredential(credential.id, credential.name) : null;
    if (!employee) return NextResponse.json({ success: true, data: null });
    const ledger = await hrToolService.getEmployeeCycleLedger(employee.id, request.nextUrl.searchParams.get('month'));
    if (!ledger) return NextResponse.json({ success: true, data: null });
    const { month, periodFrom, periodTo, doj, days, totals, leave, locked, saved } = ledger;
    const [allRegs, policy] = await Promise.all([hrToolService.getRegularizationsForEmployee(employee.id), hrToolService.getPolicySummary()]);
    // Tile counts + one calendar dot per date, worked out exactly as the HR attendance calendar does.
    const { regularizations, regDays } = summarizeCycleRegularizations(allRegs, periodFrom, periodTo, policy.regularizationMonthlyQuota);
    return NextResponse.json({
      success: true,
      data: { month, periodFrom, periodTo, doj, days, totals, leave, locked, payrollRun: !!saved, shortLeaveQuota: policy.shortLeaveMonthlyQuota, regularizations, regDays },
    });
  } catch (error) {
    console.error('Error building own attendance ledger:', error);
    return NextResponse.json({ success: false, error: 'Failed to load attendance' }, { status: 500 });
  }
}
