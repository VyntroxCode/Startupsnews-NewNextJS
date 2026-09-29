import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import type { StartExitInput } from '@/modules/hr-offboarding/service/hr-offboarding.service';
import { errorResponse, hrOffboardingService, resultResponse } from './_lib';

/** GET /api/admin/hr-tool/offboarding — every case, its clearance items, and the settings.
 * POST /api/admin/hr-tool/offboarding — HR starts an exit (termination, or a resignation handed in
 * offline) — see HrOffboardingService.startByAdmin for the body. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({ success: true, data: await hrOffboardingService.listCases() });
  } catch (error) {
    return errorResponse(error, 'Failed to load offboarding');
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, badBody] = await parseJsonBody<StartExitInput>(request);
    if (badBody) return badBody;
    return resultResponse(await hrOffboardingService.startByAdmin(body || {}, auth.user.name || auth.user.email));
  } catch (error) {
    return errorResponse(error, 'Failed to start exit');
  }
}
