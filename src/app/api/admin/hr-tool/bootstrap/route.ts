import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { hrToolService } from '../_lib';

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await hrToolService.getBootstrap();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching HR tool bootstrap data:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch HR tool data' },
      { status: 500 }
    );
  }
}
