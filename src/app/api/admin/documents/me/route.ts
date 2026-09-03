import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { hrCredentialsService, hrToolService, DOCUMENT_ROLES } from '../_lib';

/** GET /api/admin/documents/me — the caller's own required-document checklist (Publisher/Event
 * Admin, resolved via their linked hr_employee_credentials row), merged against what they've
 * uploaded, plus completion percentage. `progressPct`/`totalRequired`/`totalSubmitted` reflect
 * only the KYC & Personal Documents checklist (/api/admin/kyc), matching the plain Employee
 * Panel's equivalent route: this page offers KYC uploads and nothing else, so completion has to
 * track what the caller can actually finish here. The generic `documents` array is still
 * returned untouched for any consumer that wants it. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, DOCUMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json({ success: true, data: { linked: false } } as const);
    }

    const [data, kyc] = await Promise.all([
      hrToolService.getDocumentsForCredential(credential.id, credential.name),
      hrToolService.getKycForCredential(credential.id, credential.name),
    ]);
    const totalRequired = kyc.progress?.total || 0;
    const totalSubmitted = kyc.progress?.submitted || 0;
    const progressPct = kyc.progress?.pct ?? 0;

    return NextResponse.json({
      success: true,
      data: { employeeCode: credential.employeeCode, name: credential.name, ...data, progressPct, totalRequired, totalSubmitted },
    });
  } catch (error) {
    console.error('Error fetching admin-surface documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
