import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import type { ResignInput } from '@/modules/hr-offboarding/service/hr-offboarding.service';
import { hrOffboardingService } from './_lib';

/** GET /api/employee/offboarding — the caller's "My Exit" view: current case, history, and the
 * resign-form defaults. Allowed for alumni (past their LWD) — it is the one page they keep.
 * POST /api/employee/offboarding — submit a resignation { reasonCategory, reasonText,
 * requestedLwd, personalEmail, handoverNotes }. Not for alumni. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request, { allowAlumni: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const employee = await hrOffboardingService.employeeForCredential(auth.credential.id, auth.credential.name);
    const data = await hrOffboardingService.getMyExit(employee, auth.credential.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching employee offboarding:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load your exit details' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<ResignInput>(request);
    if (errorResponse) return errorResponse;

    const employee = await hrOffboardingService.employeeForCredential(auth.credential.id, auth.credential.name);
    if (!employee) return NextResponse.json({ success: false, error: NO_DIRECTORY_RECORD_ERROR }, { status: 400 });

    const result = await hrOffboardingService.resign(employee, auth.credential.id, body || {});
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error submitting resignation:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit resignation' },
      { status: 500 }
    );
  }
}
