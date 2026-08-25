import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from './_lib';

interface KycSaveBody { slotKey?: string; fields?: Record<string, string>; url?: string; }

/** POST /api/employee/kyc — { slotKey, fields?, url? } saves one KYC checklist slot's text
 * fields and/or a newly-uploaded file (already PUT to S3 via /api/employee/documents/presign,
 * reused as-is — it's a generic filename/contentType presign, not tied to the generic-checklist
 * route) for the logged-in employee. Field values are validated server-side (see
 * HrToolService.saveKycSlot) regardless of what the client already checked. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<KycSaveBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.slotKey) {
      return NextResponse.json({ success: false, error: 'slotKey is required' }, { status: 400 });
    }

    const { credential } = auth;
    const result = await hrToolService.saveKycSlot(credential.id, credential.name, body.slotKey, { fields: body.fields, url: body.url });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error saving employee KYC document:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save KYC document' },
      { status: 500 }
    );
  }
}
