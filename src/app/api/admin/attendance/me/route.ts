import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { hrCredentialsService, hrToolService, ATTENDANCE_ROLES, todayStr, monthRange } from '../_lib';

/** GET /api/admin/attendance/me?month=YYYY-MM — the caller's own HR identity (if any) + today's
 * punch status + that month's day-by-day attendance (for the calendar view; defaults to the current month). */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, ATTENDANCE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json({ success: true, data: { linked: false } } as const);
    }

    const { month, from, to } = monthRange(request.nextUrl.searchParams.get('month'));
    const [punch, calendar, policy, regularizations, usedThisMonth] = await Promise.all([
      hrToolService.getPunchByEmp(credential.name),
      hrToolService.getAttendanceForEmployeeInRange(credential.name, from, to),
      hrToolService.getPolicySummary(),
      hrToolService.getRegularizationsForEmployee(credential.name),
      hrToolService.countRegularizationsForEmployeeInMonth(credential.name, from, to),
    ]);

    const today = todayStr();
    const isToday = punch?.date === today;

    return NextResponse.json({
      success: true,
      data: {
        linked: true,
        employeeCode: credential.employeeCode,
        name: credential.name,
        today: {
          inTime: isToday ? punch?.inTime || null : null,
          outTime: isToday ? punch?.outTime || null : null,
          inMinutes: isToday ? punch?.inMinutes ?? null : null,
        },
        month,
        calendar,
        shiftRules: { shiftStartTime: policy.shiftStartTime, shiftEndTime: policy.shiftEndTime, shiftGraceMinutes: policy.shiftGraceMinutes },
        regularizations,
        regularizationPolicy: { windowDays: policy.regularizationWindowDays, monthlyQuota: policy.regularizationMonthlyQuota, usedThisMonth },
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
