import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import type { OffboardingSettings } from '@/modules/hr-offboarding/domain/types';
import { errorResponse, hrOffboardingService, resultResponse } from '../_lib';

/** PUT /api/admin/hr-tool/offboarding/settings — default clearance checklist, encashable leave types (notice is fixed at NOTICE_DAYS). */
export async function PUT(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, badBody] = await parseJsonBody<Partial<OffboardingSettings>>(request);
    if (badBody) return badBody;
    return resultResponse(await hrOffboardingService.saveSettings(body || {}, auth.user.name || auth.user.email));
  } catch (error) {
    return errorResponse(error, 'Failed to save offboarding settings');
  }
}
