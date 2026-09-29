import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_EXIT_PANEL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import type { ResignInput } from '@/modules/hr-offboarding/service/hr-offboarding.service';
import { hrCredentialsService, hrOffboardingService } from './_lib';

/** GET /api/admin/my-exit — the Publisher/Event Admin's own "My Exit" view.
 * POST /api/admin/my-exit — submit a resignation (same body as /api/employee/offboarding). */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_EXIT_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json({ success: true, data: await hrOffboardingService.getMyExit(null, 0) });
    }
    const employee = await hrOffboardingService.employeeForCredential(credential.id, credential.name);
    return NextResponse.json({ success: true, data: await hrOffboardingService.getMyExit(employee, credential.id) });
  } catch (error) {
    console.error('Error fetching my exit:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load your exit details' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_EXIT_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<ResignInput>(request);
    if (errorResponse) return errorResponse;

    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    const employee = credential ? await hrOffboardingService.employeeForCredential(credential.id, credential.name) : null;
    if (!credential || !employee) return NextResponse.json({ success: false, error: NO_DIRECTORY_RECORD_ERROR }, { status: 400 });

    const result = await hrOffboardingService.resign(employee, credential.id, body || {});
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
