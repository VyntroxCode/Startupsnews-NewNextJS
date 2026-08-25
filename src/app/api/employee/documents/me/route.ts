import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService } from '../_lib';

/** GET /api/employee/documents/me — the logged-in employee's required-document checklist,
 * merged against what they've actually uploaded, plus their overall completion percentage.
 * `progressPct`/`totalRequired`/`totalSubmitted` are combined across this generic checklist AND
 * the separate KYC & Personal Documents checklist (PAN/Aadhaar/bank/education/experience — see
 * /api/employee/kyc), so "profile completion" reflects the whole picture; `documents` itself is
 * untouched (still just this generic list) so existing consumers of the plain array are unaffected.
 * This combining is deliberately only done here (the employee route), not in the shared service
 * method the Publisher/Event Admin surface also calls — KYC is an employee-only checklist. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
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
    console.error('Error fetching employee documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
