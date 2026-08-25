import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { hrCredentialsService, hrToolService, DOCUMENT_ROLES } from '../_lib';

/** GET /api/admin/kyc/me — the calling Publisher/Event Admin's own KYC & Personal Documents
 * checklist (PAN, Aadhaar, bank statements, education, experience — see domain/kyc.ts), same
 * checklist the plain Employee Panel gets at /api/employee/kyc, resolved via their linked
 * hr_employee_credentials row (same pattern as /api/admin/documents/me). */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, DOCUMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json({ success: true, data: { linked: false } } as const);
    }

    const data = await hrToolService.getKycForCredential(credential.id, credential.name);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching admin-surface KYC documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch KYC documents' },
      { status: 500 }
    );
  }
}
