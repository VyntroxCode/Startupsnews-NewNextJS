import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_EXIT_PANEL_ROLES } from '@/shared/middleware/roles';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import { hrCredentialsService, hrOffboardingService } from '../_lib';

/** POST /api/admin/my-exit/withdraw — withdraw the caller's resignation while it is still pending. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_EXIT_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    const employee = credential ? await hrOffboardingService.employeeForCredential(credential.id, credential.name) : null;
    if (!employee) return NextResponse.json({ success: false, error: NO_DIRECTORY_RECORD_ERROR }, { status: 400 });

    const result = await hrOffboardingService.withdraw(employee);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error withdrawing resignation:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to withdraw resignation' },
      { status: 500 }
    );
  }
}
