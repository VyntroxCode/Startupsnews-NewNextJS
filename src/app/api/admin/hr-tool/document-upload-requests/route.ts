import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrToolService } from '@/modules/hr-tool/service/hr-tool.service';
import { HrToolRepository } from '@/modules/hr-tool/repository/hr-tool.repository';

const hrToolService = new HrToolService(new HrToolRepository());

/** GET — every document-upload permission request, pending first. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;
  try {
    const data = await hrToolService.listDocumentUploadRequests();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error listing document upload requests:', error);
    return NextResponse.json({ success: false, error: 'Failed to list requests' }, { status: 500 });
  }
}

interface DecideBody { id?: number; decision?: 'approved' | 'rejected'; remarks?: string; decidedBy?: string }

/** POST — { id, decision, remarks } approves or rejects one request. Approval reopens that
 * employee's upload window by pushing their documents_deadline forward. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;
  try {
    const [body, errorResponse] = await parseJsonBody<DecideBody>(request);
    if (errorResponse) return errorResponse;
    if (!body?.id || (body.decision !== 'approved' && body.decision !== 'rejected')) {
      return NextResponse.json({ success: false, error: 'id and decision are required' }, { status: 400 });
    }
    const result = await hrToolService.decideDocumentUploadRequest(
      Number(body.id), body.decision, (body.decidedBy || 'HR').trim(), body.remarks || ''
    );
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 409 });
    return NextResponse.json({ success: true, data: { grantedUntil: result.grantedUntil } });
  } catch (error) {
    console.error('Error deciding document upload request:', error);
    return NextResponse.json({ success: false, error: 'Failed to record decision' }, { status: 500 });
  }
}
