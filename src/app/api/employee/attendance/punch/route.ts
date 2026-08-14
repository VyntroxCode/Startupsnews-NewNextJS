import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../_lib';

interface PunchBody { type?: 'in' | 'out'; }

/** POST /api/employee/attendance/punch — { type: 'in' | 'out' }. Once-per-calendar-day, enforced server-side. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<PunchBody>(request);
    if (errorResponse) return errorResponse;
    if (body?.type !== 'in' && body?.type !== 'out') {
      return NextResponse.json({ success: false, error: 'type must be "in" or "out"' }, { status: 400 });
    }

    const result = await hrToolService.punchEmployee(auth.credential.name, body.type);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }

    return NextResponse.json({ success: true, data: { today: result.today, note: result.note } });
  } catch (error) {
    console.error('Error recording employee punch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record punch' },
      { status: 500 }
    );
  }
}
