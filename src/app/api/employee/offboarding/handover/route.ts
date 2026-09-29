import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import { hrOffboardingService } from '../_lib';

/** POST /api/employee/offboarding/handover — { handoverNotes }: update the caller's handover notes
 * while their resignation is pending or they are serving notice. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<{ handoverNotes?: string }>(request);
    if (errorResponse) return errorResponse;
    const employee = await hrOffboardingService.employeeForCredential(auth.credential.id, auth.credential.name);
    if (!employee) return NextResponse.json({ success: false, error: NO_DIRECTORY_RECORD_ERROR }, { status: 400 });

    const result = await hrOffboardingService.updateMyHandover(employee, body?.handoverNotes);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error saving handover notes:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save handover notes' },
      { status: 500 }
    );
  }
}
