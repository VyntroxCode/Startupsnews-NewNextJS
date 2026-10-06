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
    // Records belong to the Directory record behind this login, looked up by id — not the name.
    const employee = await hrToolService.resolveEmployeeForCredential(credential.id, credential.name);
    if (!employee) {
      return NextResponse.json({ success: true, data: { linked: false } } as const);
    }
    const { month, from, to } = monthRange(request.nextUrl.searchParams.get('month'));
    const [punch, calendar, policy, regularizations, regUsage, allHolidays, allLeave, hrOverrides, missedPunchOuts] = await Promise.all([
      hrToolService.getPunchByEmployee(employee.id),
      hrToolService.getAttendanceForEmployeeInRange(employee.id, from, to),
      hrToolService.getPolicySummary(),
      hrToolService.getRegularizationsForEmployee(employee.id),
      hrToolService.getRegularizationUsage(employee.id),
      hrToolService.getHolidays(),
      hrToolService.getLeaveRequestsForEmployee(employee.id),
      hrToolService.getAttendanceOverridesForEmployeeInRange(employee.id, from, to),
      hrToolService.getMissedPunchOuts(employee.id),
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
        name: employee.name,
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
        // Recent days with a punch-in but no punch-out that can still be regularized (any month).
        missedPunchOuts,
        // Days HR set a status on directly — the status (not the punches) decides them, and pay.
        hrOverrides: hrOverrides.map((o) => ({ date: o.date, status: o.status, reason: o.reason })),
        // Approved leave overlapping this month, so the calendar can mark leave days.
        leaves: allLeave
          .filter((l) => l.status === 'approved' && l.type !== 'WFH' && l.from <= to && l.to >= from)
          .map((l) => ({ from: l.from, to: l.to, type: l.type, halfDay: l.halfDay || null })),
        regularizationPolicy: { windowDays: policy.regularizationWindowDays, monthlyQuota: regUsage.quota, usedThisMonth: regUsage.used, cycleFrom: regUsage.from, cycleTo: regUsage.to },
        // Punch In / Punch Out clock windows (also the times a regularization may request).
        punchWindows: policy.punchWindows,
        // Tells the widget whether to ask the browser for location before punching.
        geofence: {
          enabled: policy.geoFencing, radiusM: policy.geoFenceRadiusM,
        },
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
