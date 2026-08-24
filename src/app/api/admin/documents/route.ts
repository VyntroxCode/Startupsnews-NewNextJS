import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrCredentialsService, hrToolService, DOCUMENT_ROLES } from './_lib';

interface DocumentUploadBody { name?: string; url?: string; }

/** POST /api/admin/documents — { name, url } records a file (already PUT to S3 via the shared
 * /api/admin/presign route) against one required-document checklist item, for the calling
 * Publisher/Event Admin's own linked Directory record. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, DOCUMENT_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<DocumentUploadBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.name || !body?.url) {
      return NextResponse.json({ success: false, error: 'name and url are required' }, { status: 400 });
    }

    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) {
      return NextResponse.json(
        { success: false, error: 'No Employee ID has been linked to your account yet — ask your Founder to link one from HR Management → Directory.' },
        { status: 400 }
      );
    }

    const result = await hrToolService.recordDocumentUpload(credential.id, credential.name, body.name, body.url);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error recording admin-surface document upload:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record document upload' },
      { status: 500 }
    );
  }
}
