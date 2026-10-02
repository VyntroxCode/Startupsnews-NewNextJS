import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../_lib';

interface Body { employeeId?: string; type?: string; from?: string; to?: string; reason?: string; halfDay?: string | null }

/**
 * POST /api/admin/hr-tool/leave-requests — HR Management's "+ Apply for leave", through the SAME
 * validation as the employee portal (enabled types only, today/yesterday onward, half-day rules,
 * overlap, no full-day leave on a punched day). Replaces the old whole-list PUT, which let the
 * browser rewrite every leave request with no checks at all. Decisions go through ./decide and
 * cancellations through ./cancel.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Body>(request);
    if (errorResponse) return errorResponse;
    if (!body?.employeeId || !body?.type || !body?.from || !body?.to || !body?.reason) {
      return NextResponse.json({ success: false, error: 'employeeId, type, from, to and reason are required' }, { status: 400 });
    }
    const employee = await hrToolService.findEmployeeRef(body.employeeId);
    if (!employee) return NextResponse.json({ success: false, error: 'employeeId must be an existing Directory employee' }, { status: 400 });

    const result = await hrToolService.submitEmployeeLeaveRequest(employee, body.type, body.from, body.to, body.reason, body.halfDay);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: { created: result.created, paidDays: result.paidDays, unpaidDays: result.unpaidDays } });
  } catch (error) {
    console.error('Error submitting HR-tool leave request:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit the leave request' }, { status: 500 });
  }
}
