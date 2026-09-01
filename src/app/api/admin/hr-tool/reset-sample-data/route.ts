import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../_lib';

/** Destructive — deletes real employees/attendance/leave/expense/ticket rows outright (see
 * HrToolRepository.resetSampleData). Gated off by default: only runs when ALLOW_SAMPLE_DATA_RESET
 * is explicitly set to 'true' in this deployment's env, so a production checkout that never sets
 * it can't have this hit even if the request is somehow made (role auth alone isn't enough — a
 * compromised or mistaken admin session shouldn't be able to wipe a live production database). */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  if (process.env.ALLOW_SAMPLE_DATA_RESET !== 'true') {
    return NextResponse.json(
      { success: false, error: 'Sample-data reset is disabled on this deployment.' },
      { status: 403 }
    );
  }

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
