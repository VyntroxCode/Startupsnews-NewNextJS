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

    // Records belong to the Directory record behind this login, looked up by id — not the name.
    const employee = await hrToolService.resolveEmployeeForCredential(credential.id, credential.name);
    if (!employee) {
      return NextResponse.json({ success: true, data: { linked: false } } as const);
    }

    const { month, from, to } = monthRange(request.nextUrl.searchParams.get('month'));
    const [punch, calendar, policy, regularizations, regUsage, allHolidays] = await Promise.all([
      hrToolService.getPunchByEmployee(employee.id),
      hrToolService.getAttendanceForEmployeeInRange(employee.id, from, to),
      hrToolService.getPolicySummary(),
      hrToolService.getRegularizationsForEmployee(employee.id),
      hrToolService.getRegularizationUsage(employee.id),
      hrToolService.getHolidays(),
    ]);
    // Same admin Holiday calendar shown in the Employee Panel's attendance widget — this route
    // feeds the same shared <AttendanceWidget> for the Publisher/Event Admin's own attendance tab.
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
        regularizationPolicy: { windowDays: policy.regularizationWindowDays, monthlyQuota: regUsage.quota, usedThisMonth: regUsage.used, cycleFrom: regUsage.from, cycleTo: regUsage.to },
        // Tells the widget whether to ask the browser for location before punching.
        geofence: {
          enabled: policy.geoFencing, radiusM: policy.geoFenceRadiusM,
          // Approved Work From Home today → already recorded as a full day; the widget hides punching.
          wfhToday: await hrToolService.isApprovedWfhDay(employee.id, todayStr()),
        },
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
