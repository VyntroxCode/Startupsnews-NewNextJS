import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../../_lib';

/** POST /api/admin/hr-tool/payroll-runs/reverse — { month, reason? }. Discards a drafted (run, not
 * frozen) month so it goes back to "not run" (HrToolService.reversePayroll); audit-logged. A frozen
 * month is final and is refused (409). */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<{ month?: string; reason?: string }>(request);
    if (errorResponse) return errorResponse;
    if (!body?.month || !/^\d{4}-\d{2}$/.test(body.month)) return NextResponse.json({ success: false, error: 'month is required' }, { status: 400 });
    const result = await hrToolService.reversePayroll(body.month, body.reason || '', auth.user.email);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reversing payroll:', error);
    return NextResponse.json({ success: false, error: 'Failed to reverse payroll' }, { status: 500 });
  }
}
