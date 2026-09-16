import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { parsePunchLocation } from '@/modules/hr-tool/utils/geofence';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import { hrCredentialsService, hrToolService, ATTENDANCE_ROLES } from '../_lib';

interface PunchBody { type?: 'in' | 'out'; location?: unknown; }

/**
 * POST /api/admin/attendance/punch — { type: 'in' | 'out', location?: { lat, lng, accuracy } }.
 * Once-per-calendar-day, enforced server-side (409 ALREADY_PUNCHED). When the Geo-fencing rule
 * is on, the browser-supplied location is checked against the office fence server-side and a
 * refusal is a 403 with `code` GEOFENCE_LOCATION_REQUIRED | GEOFENCE_IMPRECISE | GEOFENCE_OUTSIDE.
 */
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

    const employee = await hrToolService.resolveEmployeeForCredential(credential.id, credential.name);
    if (!employee) return NextResponse.json({ success: false, error: NO_DIRECTORY_RECORD_ERROR }, { status: 400 });

    const result = await hrToolService.punchEmployee(employee, body.type, parsePunchLocation(body.location));
    if (!result.ok) {
      const status = result.code?.startsWith('GEOFENCE_') ? 403 : 409;
      return NextResponse.json({ success: false, error: result.error, code: result.code }, { status });
    }

    const policy = await hrToolService.getPolicySummary();
    const shiftRules = { shiftStartTime: policy.shiftStartTime, shiftEndTime: policy.shiftEndTime, shiftGraceMinutes: policy.shiftGraceMinutes };
    return NextResponse.json({ success: true, data: { today: result.today, note: result.note, geo: result.geo, shiftRules } });
  } catch (error) {
    console.error('Error recording punch:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record punch' },
      { status: 500 }
    );
  }
}
