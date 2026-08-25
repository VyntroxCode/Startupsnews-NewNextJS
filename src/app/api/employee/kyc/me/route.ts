import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService } from '../_lib';

/** GET /api/employee/kyc/me — the logged-in employee's KYC & Personal Documents checklist
 * (PAN, Aadhaar, bank statements, education, experience — see domain/kyc.ts), merged against
 * the fixed slot schema, plus that checklist's own completion numbers. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
    const data = await hrToolService.getKycForCredential(credential.id, credential.name);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching employee KYC documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch KYC documents' },
      { status: 500 }
    );
  }
}
