import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrPayrollRun } from '@/modules/hr-tool/domain/types';
import { hrToolService, getPayrollRoster } from '../_lib';

/** POST /api/admin/hr-tool/payroll-runs — { month: 'YYYY-MM' }. Computes and freezes real
 * Net Pay for every active employee that month (see HrToolService.runPayroll); refuses if the
 * payroll period hasn't fully elapsed yet. Calling it again for an already-run month
 * recomputes and overwrites — that's the "recompute" mechanism, no separate endpoint. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Pick<HrPayrollRun, 'month'>>(request);
    if (errorResponse) return errorResponse;
    if (!body?.month) return NextResponse.json({ success: false, error: 'month is required' }, { status: 400 });

    const roster = await getPayrollRoster();
    const result = await hrToolService.runPayroll(body.month, roster, auth.user.email);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: { entries: result.entries } });
  } catch (error) {
    console.error('Error running HR payroll:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run payroll' },
      { status: 400 }
    );
  }
}
