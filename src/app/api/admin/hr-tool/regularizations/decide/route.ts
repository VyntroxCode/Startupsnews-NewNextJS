import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrToolService } from '@/modules/hr-tool/service/hr-tool.service';
import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';

const hrToolService = new HrToolService(new HrToolRepository());

interface Body { id?: string; level?: 'rm' | 'hr'; decision?: 'approved' | 'rejected'; remarks?: string }

/** POST /api/admin/hr-tool/regularizations/decide — finalizes one regularization's approve/
 * reject decision server-side, so that a fully-approved punch-in/out correction actually gets
 * written into hr_attendance (see HrToolService.decideRegularization) instead of only ever
 * flipping a status flag on the request itself. Replaces the old client-only path (compute the
 * decision in the browser, PUT the whole regularizations array via the route above), which had
 * no hook point for that write-back. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Body>(request);
    if (errorResponse) return errorResponse;
    if (!body?.id || (body.level !== 'rm' && body.level !== 'hr') || (body.decision !== 'approved' && body.decision !== 'rejected')) {
      return NextResponse.json({ success: false, error: 'id, level, and decision are required' }, { status: 400 });
    }

    const result = await hrToolService.decideRegularization(body.id, body.level, body.decision, body.remarks || '');
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    return NextResponse.json({ success: true, data: result.updated });
  } catch (error) {
    console.error('Error deciding HR-tool regularization:', error);
    return NextResponse.json({ success: false, error: 'Failed to save the decision' }, { status: 500 });
  }
}
