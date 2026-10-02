import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { hrToolService } from '../_lib';

/** GET /api/admin/hr-tool/attendance-summary?month=YYYY-MM — every employee's attendance totals
 * for one pay cycle (HrToolService.getCycleAttendanceSummary), the same numbers payroll pays by.
 * `month` is the cycle's end month; omitted, today's cycle. Powers the Attendance page overview. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await hrToolService.getCycleAttendanceSummary(request.nextUrl.searchParams.get('month'));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error building attendance summary:', error);
    return NextResponse.json({ success: false, error: 'Failed to load attendance' }, { status: 500 });
  }
}
