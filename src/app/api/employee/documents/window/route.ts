import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../_lib';

/** GET — is this employee's document-upload window open, and do they already have a request in? */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { credential } = auth;
    const data = await hrToolService.getDocumentWindowForCredential(credential.id, credential.name);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error reading document window:', error);
    return NextResponse.json({ success: false, error: 'Failed to read document window' }, { status: 500 });
  }
}

/** POST — { reason } asks HR to reopen a closed window. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const [body, errorResponse] = await parseJsonBody<{ reason?: string }>(request);
    if (errorResponse) return errorResponse;
    const { credential } = auth;
    const result = await hrToolService.requestDocumentUploadPermission(credential.id, credential.name, body?.reason || '');
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error submitting document upload request:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit request' }, { status: 500 });
  }
}
