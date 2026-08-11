import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrPunch } from '@/modules/hr-tool/domain/types';
import { hrToolService } from '../_lib';

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<HrPunch>(request);
    if (errorResponse) return errorResponse;
    if (!body?.emp || !body?.date) return NextResponse.json({ success: false, error: 'emp and date are required' }, { status: 400 });

    await hrToolService.recordPunch(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording HR punch log:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record punch' },
      { status: 400 }
    );
  }
}
