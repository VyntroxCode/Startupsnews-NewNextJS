import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrCompanyProfile } from '@/modules/hr-tool/domain/types';
import { hrToolService } from '../_lib';

export async function PUT(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<HrCompanyProfile>(request);
    if (errorResponse) return errorResponse;
    if (!body?.companyName?.trim() || !body?.cin?.trim() || !body?.registeredState?.trim()) {
      return NextResponse.json({ success: false, error: 'Company name, CIN, and registered state are all required' }, { status: 400 });
    }

    await hrToolService.saveCompanyProfile(
      { companyName: body.companyName.trim(), cin: body.cin.trim(), registeredState: body.registeredState.trim() },
      auth.user.email
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving HR company profile:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save company profile' },
      { status: 400 }
    );
  }
}
