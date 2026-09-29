import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { NO_DIRECTORY_RECORD_ERROR } from '@/modules/hr-tool/service/hr-tool.service';
import { hrOffboardingService } from '../_lib';

/** POST /api/employee/offboarding/withdraw — withdraw the caller's resignation while it is still pending. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const employee = await hrOffboardingService.employeeForCredential(auth.credential.id, auth.credential.name);
    if (!employee) return NextResponse.json({ success: false, error: NO_DIRECTORY_RECORD_ERROR }, { status: 400 });

    const result = await hrOffboardingService.withdraw(employee);
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status || 400 });
    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error withdrawing resignation:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to withdraw resignation' },
      { status: 500 }
    );
  }
}
