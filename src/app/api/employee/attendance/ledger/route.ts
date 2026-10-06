import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { countedRegularizationDates } from '@/modules/hr-tool/utils/regularization-policy';
import { hrToolService } from '../_lib';

/** GET /api/employee/attendance/ledger?month=YYYY-MM — the logged-in employee's own pay cycle day
 * by day, with the same totals payroll pays by (HrToolService.getEmployeeCycleLedger). Days and
 * totals only — salary figures stay in the payslip. Also the cycle's regularization counts and the
 * short-leave rule, worked out exactly as the HR attendance calendar does, so the employee's tiles
 * read the same as HR's. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
    const employee = await hrToolService.resolveEmployeeForCredential(credential.id, credential.name);
    if (!employee) return NextResponse.json({ success: true, data: null });
    const ledger = await hrToolService.getEmployeeCycleLedger(employee.id, request.nextUrl.searchParams.get('month'));
    if (!ledger) return NextResponse.json({ success: true, data: null });
    const { month, periodFrom, periodTo, doj, days, totals, leave, locked, saved } = ledger;
    const [allRegs, policy] = await Promise.all([hrToolService.getRegularizationsForEmployee(employee.id), hrToolService.getPolicySummary()]);
    // Only requests the employee applied for in this cycle, counted in DAYS (in + out on one date
    // is one day) — converted HR edits left out, as the limit does.
    const regs = allRegs.filter((r) => r.source !== 'hr-edit' && r.date >= periodFrom && r.date <= periodTo);
    const regularizations = {
      pending: new Set(regs.filter((r) => r.status === 'pending').map((r) => r.date)).size,
      applied: new Set(regs.map((r) => r.date)).size,
      approved: new Set(regs.filter((r) => r.stage === 'done' && r.status === 'approved').map((r) => r.date)).size,
      limitUsed: countedRegularizationDates(regs, periodFrom, periodTo).size,
      quota: policy.regularizationMonthlyQuota,
    };
    return NextResponse.json({
      success: true,
      data: { month, periodFrom, periodTo, doj, days, totals, leave, locked, payrollRun: !!saved, shortLeaveQuota: policy.shortLeaveMonthlyQuota, regularizations },
    });
  } catch (error) {
    console.error('Error building own attendance ledger:', error);
    return NextResponse.json({ success: false, error: 'Failed to load attendance' }, { status: 500 });
  }
}
