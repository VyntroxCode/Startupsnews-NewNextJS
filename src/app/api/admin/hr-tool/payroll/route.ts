import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { hrToolService, getPayrollRoster, getEmployeeCodes } from '../_lib';
import { todayStr } from '@/modules/hr-tool/utils/time';

function isValidMonthKey(v: string | null): v is string {
  return !!v && /^\d{4}-\d{2}$/.test(v);
}

/** GET /api/admin/hr-tool/payroll?month=YYYY-MM — payroll for that month: the saved
 * hr_payroll_entries (draft or frozen) if it's been run, otherwise a live preview, plus the
 * cycle state (Run / Freeze / Reverse availability). Defaults to the current month if the param
 * is missing/malformed. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const monthParam = request.nextUrl.searchParams.get('month');
    const month = isValidMonthKey(monthParam) ? monthParam : todayStr().slice(0, 7);

    const [roster, codes] = await Promise.all([getPayrollRoster(), getEmployeeCodes()]);
    const data = await hrToolService.getPayrollForMonth(month, roster, codes);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error computing HR payroll:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to compute payroll' },
      { status: 500 }
    );
  }
}
