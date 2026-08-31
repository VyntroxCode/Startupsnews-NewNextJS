import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService } from '../_lib';

/** GET /api/employee/documents/me — the logged-in employee's required-document checklist,
 * merged against what they've actually uploaded, plus their overall completion percentage.
 * `progressPct`/`totalRequired`/`totalSubmitted` reflect only the KYC & Personal Documents
 * checklist (PAN/Aadhaar/bank/education/experience — see /api/employee/kyc): the employee
 * Documents page only offers KYC uploads, so "profile completion" has to track what the
 * employee can actually complete there. `documents` itself is untouched (still the generic
 * admin-configured list, `hr_required_documents`) so existing consumers of the plain array —
 * e.g. the admin Directory/Document Review screens — are unaffected. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
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
    console.error('Error fetching employee documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
