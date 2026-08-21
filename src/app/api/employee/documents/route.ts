import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from './_lib';

interface DocumentUploadBody { name?: string; url?: string; }

/** POST /api/employee/documents — { name, url } records a file (already PUT to S3 via
 * /presign) against one required-document checklist item for the logged-in employee. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<DocumentUploadBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.name || !body?.url) {
      return NextResponse.json({ success: false, error: 'name and url are required' }, { status: 400 });
    }

    const { credential } = auth;
    const result = await hrToolService.recordDocumentUpload(credential.id, credential.name, body.name, body.url);
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('Error recording employee document upload:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record document upload' },
      { status: 500 }
    );
  }
}
