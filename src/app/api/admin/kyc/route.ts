import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrCredentialsService, hrToolService, DOCUMENT_ROLES } from './_lib';

interface KycSaveBody { slotKey?: string; fields?: Record<string, string>; url?: string; }

/** POST /api/admin/kyc — { slotKey, fields?, url? } saves one KYC checklist slot for the
 * calling Publisher/Event Admin's own linked Directory record (mirrors POST /api/employee/kyc). */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, DOCUMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<KycSaveBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.slotKey) {
      return NextResponse.json({ success: false, error: 'slotKey is required' }, { status: 400 });
    }

    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'No Employee ID has been linked to your account yet — ask your Founder to link one from HR Management → Directory.' },
        { status: 400 }
      );
    }

    const result = await hrToolService.saveKycSlot(credential.id, credential.name, body.slotKey, { fields: body.fields, url: body.url });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error saving admin-surface KYC document:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save KYC document' },
      { status: 500 }
    );
  }
}
