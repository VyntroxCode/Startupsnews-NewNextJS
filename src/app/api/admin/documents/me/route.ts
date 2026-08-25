import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { hrCredentialsService, hrToolService, DOCUMENT_ROLES } from '../_lib';

/** GET /api/admin/documents/me — the caller's own required-document checklist (Publisher/Event
 * Admin, resolved via their linked hr_employee_credentials row), merged against what they've
 * uploaded, plus completion percentage. `progressPct`/`totalRequired`/`totalSubmitted` are
 * combined with the separate KYC & Personal Documents checklist (/api/admin/kyc), same combining
 * the plain Employee Panel's equivalent route does — see that route's comment for why it's done
 * per-route rather than in the shared service method. */
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
    const genericTotal = data.requiredDocuments?.length || 0;
    const genericSubmitted = (data.documents || []).filter((d) => d.status === 'pending' || d.status === 'approved').length;
    const totalRequired = genericTotal + (kyc.progress?.total || 0);
    const totalSubmitted = genericSubmitted + (kyc.progress?.submitted || 0);
    const progressPct = totalRequired ? Math.round((totalSubmitted / totalRequired) * 100) : (data.progressPct ?? 0);

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
