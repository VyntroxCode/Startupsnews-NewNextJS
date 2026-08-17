import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { hrToolService, ATTENDANCE_ROLES } from '../_lib';

/** GET /api/admin/attendance/policy — the admin-configured shift timings, grace period,
 * regularization rules, and short-leave policy, for the read-only "Rules & Policy" page.
 * Company-wide data, not tied to a specific employee credential — visible to anyone with
 * an attendance role even before they've been assigned an Employee ID. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, ATTENDANCE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const policy = await hrToolService.getPolicySummary();
    return NextResponse.json({ success: true, data: policy });
  } catch (error) {
    console.error('Error fetching attendance policy:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch policy details' },
      { status: 500 }
    );
  }
}
