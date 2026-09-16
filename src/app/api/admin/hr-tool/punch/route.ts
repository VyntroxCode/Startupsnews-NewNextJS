import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { parsePunchLocation } from '@/modules/hr-tool/utils/geofence';
import { hrToolService } from '../_lib';

interface Body { employeeId?: string; type?: 'in' | 'out'; location?: unknown; }

/**
 * POST /api/admin/hr-tool/punch — { emp, type: 'in' | 'out', location?: { lat, lng, accuracy } }.
 * The HR Tool's own self-service Punch In/Out (views/Attendance.tsx). Goes through the same
 * HrToolService.punchEmployee as the Publisher/Event Admin and employee-portal routes, so the
 * once-per-day rule and the Geo-fencing rule apply identically — this replaces the view's old
 * client-side write to the raw /punch-log upsert, which enforced nothing.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<Body>(request);
    if (errorResponse) return errorResponse;
    if (body?.type !== 'in' && body?.type !== 'out') {
      return NextResponse.json({ success: false, error: 'type must be "in" or "out"' }, { status: 400 });
    }
    // The punch is recorded against the Directory record's id; its name is only a display snapshot.
    const employee = await hrToolService.findEmployeeRef(typeof body.employeeId === 'string' ? body.employeeId.trim() : '');
    if (!employee) return NextResponse.json({ success: false, error: 'employeeId must be an existing Directory employee' }, { status: 400 });

    const result = await hrToolService.punchEmployee(employee, body.type, parsePunchLocation(body.location));
    if (!result.ok) {
      const status = result.code?.startsWith('GEOFENCE_') ? 403 : 409;
      return NextResponse.json({ success: false, error: result.error, code: result.code }, { status });
    }
    return NextResponse.json({ success: true, data: { today: result.today, note: result.note, geo: result.geo } });
  } catch (error) {
    console.error('Error recording HR Tool punch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record punch' },
      { status: 500 }
    );
  }
}
