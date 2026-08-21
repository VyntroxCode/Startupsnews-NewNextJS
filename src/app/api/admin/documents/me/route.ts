import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { hrCredentialsService, hrToolService, DOCUMENT_ROLES } from '../_lib';

/** GET /api/admin/documents/me — the caller's own required-document checklist (Publisher/Event
 * Admin, resolved via their linked hr_employee_credentials row), merged against what they've
 * uploaded, plus completion percentage. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, DOCUMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json({ success: true, data: { linked: false } } as const);
    }

    const data = await hrToolService.getDocumentsForCredential(credential.id, credential.name);
    return NextResponse.json({ success: true, data: { employeeCode: credential.employeeCode, name: credential.name, ...data } });
  } catch (error) {
    console.error('Error fetching admin-surface documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
