import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_EXIT_PANEL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import { hrCredentialsService, hrOffboardingService } from '../_lib';

/** POST /api/admin/my-exit/handover — { handoverNotes }: same as /api/employee/offboarding/handover
 * for a Publisher/Event Admin. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_EXIT_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<{ handoverNotes?: string }>(request);
    if (errorResponse) return errorResponse;
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    const employee = credential ? await hrOffboardingService.employeeForCredential(credential.id, credential.name) : null;
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
