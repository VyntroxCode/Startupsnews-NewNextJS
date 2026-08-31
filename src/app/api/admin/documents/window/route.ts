import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrCredentialsService, hrToolService, DOCUMENT_ROLES } from '../_lib';

/** Admin-panel twin of /api/employee/documents/window — same document-upload-window read and
 * permission request, for a Publisher/Event Admin acting as their own employee. DocumentsWidget
 * is shared between both panels, so both API bases must expose this. */
async function credentialFor(request: NextRequest) {
  const auth = await requireAnyRole(request, DOCUMENT_ROLES);
  if (auth instanceof NextResponse) return { response: auth as NextResponse };
  const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
  if (!credential) {
    return {
      response: NextResponse.json(
        { success: false, error: 'No Employee ID has been linked to your account yet.' },
        { status: 400 }
      ),
    };
  }
  return { credential };
}

export async function GET(request: NextRequest) {
  const { response, credential } = await credentialFor(request);
  if (response) return response;
  try {
    const data = await hrToolService.getDocumentWindowForCredential(credential!.id, credential!.name);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error reading document window:', error);
    return NextResponse.json({ success: false, error: 'Failed to read document window' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { response, credential } = await credentialFor(request);
  if (response) return response;
  try {
    const [body, errorResponse] = await parseJsonBody<{ reason?: string }>(request);
    if (errorResponse) return errorResponse;
    const result = await hrToolService.requestDocumentUploadPermission(credential!.id, credential!.name, body?.reason || '');
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error submitting document upload request:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit request' }, { status: 500 });
  }
}
