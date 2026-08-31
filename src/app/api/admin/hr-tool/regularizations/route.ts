import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrToolService } from '@/modules/hr-tool/service/hr-tool.service';
import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';
import { HrRegularization } from '@/modules/hr-tool/domain/types';

const hrToolService = new HrToolService(new HrToolRepository());

interface Body { emp?: string; date?: string; reason?: string; punchType?: 'in' | 'out'; requestedTime?: string }

/** PUT /api/admin/hr-tool/regularizations — replaces the full list; used by the HR tool's
 * approve/reject UI (ApprovalCell) to persist status changes. */
export async function PUT(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<HrRegularization[]>(request);
    if (errorResponse) return errorResponse;
    if (!Array.isArray(body)) return NextResponse.json({ success: false, error: 'Request body must be an array' }, { status: 400 });

    await hrToolService.saveRegularizations(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving HR regularizations:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save regularizations' },
      { status: 400 }
    );
  }
}

/**
 * POST /api/admin/hr-tool/regularizations — files a regularization from inside HR Management,
 * through the SAME validation the employee portal uses (cycle date limit, per-cycle quota,
 * duplicate check, on-time-punch check).
 *
 * Separate from /api/admin/attendance/regularizations because that route derives the employee
 * from the caller's linked panel-admin credential, which a super-admin working in the HR tool
 * may not have. Here the employee is named explicitly — safe because HR_TOOL_ROLES is
 * super-admin only, i.e. exactly the people already allowed to edit anyone's attendance.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Body>(request);
    if (errorResponse) return errorResponse;
    if (!body?.emp || !body?.date || !body?.reason || !body?.requestedTime || (body.punchType !== 'in' && body.punchType !== 'out')) {
      return NextResponse.json({ success: false, error: 'emp, date, reason, punchType and requestedTime are required' }, { status: 400 });
    }

    const result = await hrToolService.submitEmployeeRegularization(
      body.emp, body.date, body.reason, body.punchType, body.requestedTime
    );
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: result.created });
  } catch (error) {
    console.error('Error submitting HR-tool regularization:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit regularization request' }, { status: 500 });
  }
}
