import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrRegularization } from '@/modules/hr-tool/domain/types';
import { hrToolService } from '../_lib';

export async function PUT(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<HrRegularization[]>(request);
    if (errorResponse) return errorResponse;
    if (!Array.isArray(body)) return NextResponse.json({ success: false, error: 'Request body must be an array' }, { status: 400 });

    await hrToolService.saveRegularizations(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving HR regularizations:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save regularizations' },
      { status: 400 }
    );
  }
}
