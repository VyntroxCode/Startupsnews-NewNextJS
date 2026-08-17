import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../_lib';

interface RegularizationBody { date?: string; reason?: string; }

/** POST /api/employee/attendance/regularizations — { date, reason }. Only a late or grace-period
 * punch-in on that date can be regularized, subject to the admin's configured window and
 * monthly quota (see HrToolService.submitEmployeeRegularization). */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<RegularizationBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.date || !body?.reason) {
      return NextResponse.json({ success: false, error: 'date and reason are required' }, { status: 400 });
    }

    const result = await hrToolService.submitEmployeeRegularization(auth.credential.name, body.date, body.reason);
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
