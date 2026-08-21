import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../_lib';

interface RegularizationBody { date?: string; reason?: string; punchType?: 'in' | 'out'; requestedTime?: string; }

/** POST /api/employee/attendance/regularizations — { date, reason, punchType, requestedTime }.
 * Punch-in and punch-out are regularized independently (see HrToolService.submitEmployeeRegularization
 * for the eligibility rule per type), subject to the admin's configured window and monthly quota. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<RegularizationBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.date || !body?.reason || !body?.requestedTime || (body.punchType !== 'in' && body.punchType !== 'out')) {
      return NextResponse.json({ success: false, error: 'date, reason, punchType, and requestedTime are required' }, { status: 400 });
    }

    const result = await hrToolService.submitEmployeeRegularization(auth.credential.name, body.date, body.reason, body.punchType, body.requestedTime);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error submitting employee regularization:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit regularization request' },
      { status: 500 }
    );
  }
}
