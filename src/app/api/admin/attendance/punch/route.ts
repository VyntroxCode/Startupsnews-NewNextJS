import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrCredentialsService, hrToolService, ATTENDANCE_ROLES } from '../_lib';

interface PunchBody { type?: 'in' | 'out'; }

/** POST /api/admin/attendance/punch — { type: 'in' | 'out' }. Once-per-calendar-day, enforced server-side. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, ATTENDANCE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<PunchBody>(request);
    if (errorResponse) return errorResponse;
    if (body?.type !== 'in' && body?.type !== 'out') {
      return NextResponse.json({ success: false, error: 'type must be "in" or "out"' }, { status: 400 });
    }

    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'No Employee ID has been assigned to your account yet — ask your Founder to assign one under HR Management → Assigning IDs.' },
        { status: 400 }
      );
    }

    const result = await hrToolService.punchEmployee(credential.name, body.type);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, data: { today: result.today, note: result.note } });
  } catch (error) {
    console.error('Error recording punch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record punch' },
      { status: 500 }
    );
  }
}
