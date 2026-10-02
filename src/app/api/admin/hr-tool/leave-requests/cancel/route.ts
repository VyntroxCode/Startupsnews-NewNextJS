import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService, refreshPayrollForDates } from '../../_lib';

/** POST /api/admin/hr-tool/leave-requests/cancel — { id, remarks? }. HR cancels a pending or
 * approved request at any time (the employee can only before it starts), releasing the balance. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<{ id?: string; remarks?: string }>(request);
    if (errorResponse) return errorResponse;
    if (!body?.id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const result = await hrToolService.cancelLeaveRequest(body.id, { kind: 'hr' }, body.remarks || '');
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    if (result.updated) await refreshPayrollForDates([result.updated.from, result.updated.to]);
    return NextResponse.json({ success: true, data: result.updated });
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel the leave request' }, { status: 500 });
  }
}
