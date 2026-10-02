import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../../_lib';

/** POST /api/admin/hr-tool/payroll-runs/reopen — { month, reason }. Reopens a LOCKED payroll cycle
 * for a short while (HrToolService.reopenPayroll) so a mistake can be fixed and payroll re-run.
 * HR_TOOL_ROLES is super-admin only, i.e. the Founder; the reason is mandatory and audit-logged. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<{ month?: string; reason?: string }>(request);
    if (errorResponse) return errorResponse;
    if (!body?.month || !/^\d{4}-\d{2}$/.test(body.month)) return NextResponse.json({ success: false, error: 'month is required' }, { status: 400 });
    const result = await hrToolService.reopenPayroll(body.month, body.reason || '', auth.user.email);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: { reopenedUntil: result.reopenedUntil } });
  } catch (error) {
    console.error('Error reopening payroll:', error);
    return NextResponse.json({ success: false, error: 'Failed to reopen payroll' }, { status: 500 });
  }
}
