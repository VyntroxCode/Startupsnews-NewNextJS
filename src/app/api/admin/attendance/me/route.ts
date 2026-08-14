import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { hrCredentialsService, hrToolService, ATTENDANCE_ROLES, todayStr } from '../_lib';

const HISTORY_LIMIT = 14;

/** GET /api/admin/attendance/me — the caller's own HR identity (if any) + today's punch status + recent history. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, ATTENDANCE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json({ success: true, data: { linked: false } } as const);
    }

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
    console.error('Error fetching attendance identity:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch attendance details' },
      { status: 500 }
    );
  }
}
