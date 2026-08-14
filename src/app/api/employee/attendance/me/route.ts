import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService, todayStr } from '../_lib';

const HISTORY_LIMIT = 14;

/** GET /api/employee/attendance/me — the logged-in employee's own status + recent history. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
    const [punch, history] = await Promise.all([
      hrToolService.getPunchByEmp(credential.name),
      hrToolService.getAttendanceForEmployee(credential.name, HISTORY_LIMIT),
    ]);

    const today = todayStr();
    const isToday = punch?.date === today;

    return NextResponse.json({
      success: true,
      data: {
        linked: true,
        employeeCode: credential.employeeCode,
        name: credential.name,
        today: { inTime: isToday ? punch?.inTime || null : null, outTime: isToday ? punch?.outTime || null : null },
        history,
      },
    });
  } catch (error) {
    console.error('Error fetching employee attendance:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch attendance details' },
      { status: 500 }
    );
  }
}
