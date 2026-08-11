import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../_lib';

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body] = await parseJsonBody<{ keepEmployeeId?: string | null }>(request);
    await hrToolService.resetSampleData(body?.keepEmployeeId || null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting HR sample data:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to reset sample data' },
      { status: 500 }
    );
  }
}
