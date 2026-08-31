import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService, todayStr, monthRange } from '../_lib';

/** GET /api/employee/attendance/me?month=YYYY-MM — the logged-in employee's own status + that
 * month's day-by-day attendance (for the calendar view; defaults to the current month). */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
    const { month, from, to } = monthRange(request.nextUrl.searchParams.get('month'));
    const [punch, calendar, policy, regularizations, regUsage, allHolidays] = await Promise.all([
      hrToolService.getPunchByEmp(credential.name),
      hrToolService.getAttendanceForEmployeeInRange(credential.name, from, to),
      hrToolService.getPolicySummary(),
      hrToolService.getRegularizationsForEmployee(credential.name),
      hrToolService.getRegularizationUsage(credential.name),
      hrToolService.getHolidays(),
    ]);
    // The admin's Holiday calendar (HR Management → Rules & Org Structure) — filtered to this
    // month so the employee's own calendar view can shade them, same as the native HR tool's
    // AttendanceCalendar already does for HR/Founder.
    const holidays = allHolidays.filter((h) => h.date >= from && h.date <= to);

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
          outMinutes: isToday ? punch?.outMinutes ?? null : null,
        },
        month,
        calendar,
        holidays,
        shiftRules: {
          shiftStartTime: policy.shiftStartTime, shiftEndTime: policy.shiftEndTime, shiftGraceMinutes: policy.shiftGraceMinutes,
          shortLeaveMaxHours: policy.shortLeaveMaxHours, halfDayThresholdHours: policy.halfDayThresholdHours,
          halfDayMinWorkedHours: policy.halfDayMinWorkedHours, shortLeaveMinWorkedHours: policy.shortLeaveMinWorkedHours,
          fullDayMinWorkedHours: policy.fullDayMinWorkedHours,
        },
        regularizations,
        regularizationPolicy: { windowDays: policy.regularizationWindowDays, monthlyQuota: regUsage.quota, usedThisMonth: regUsage.used, cycleFrom: regUsage.from, cycleTo: regUsage.to },
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
