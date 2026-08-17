import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService } from '../_lib';

/** GET /api/employee/attendance/policy — the admin-configured shift timings, grace period,
 * regularization rules, and short-leave policy, for the read-only "Rules & Policy" page. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const policy = await hrToolService.getPolicySummary();
    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    console.error('Error fetching employee attendance policy:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch policy details' },
      { status: 500 }
    );
  }
}
