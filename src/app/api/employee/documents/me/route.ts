import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService } from '../_lib';

/** GET /api/employee/documents/me — the logged-in employee's required-document checklist,
 * merged against what they've actually uploaded, plus their overall completion percentage. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
    const data = await hrToolService.getDocumentsForCredential(credential.id, credential.name);
    return NextResponse.json({ success: true, data: { employeeCode: credential.employeeCode, name: credential.name, ...data } });
  } catch (error) {
    console.error('Error fetching employee documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
