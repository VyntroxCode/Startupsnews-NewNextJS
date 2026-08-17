import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrCredentialsService, hrToolService, ATTENDANCE_ROLES } from '../_lib';

interface RegularizationBody { date?: string; reason?: string; }

/** POST /api/admin/attendance/regularizations — { date, reason }. Only a late or grace-period
 * punch-in on that date can be regularized, subject to the admin's configured window and
 * monthly quota (see HrToolService.submitEmployeeRegularization). */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, ATTENDANCE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<RegularizationBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.date || !body?.reason) {
      return NextResponse.json({ success: false, error: 'date and reason are required' }, { status: 400 });
    }

    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'No Employee ID has been assigned to your account yet — ask your Founder to assign one under HR Management → Assigning IDs.' },
        { status: 400 }
      );
    }

    const result = await hrToolService.submitEmployeeRegularization(credential.name, body.date, body.reason);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error submitting regularization:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit regularization request' },
      { status: 500 }
    );
  }
}
