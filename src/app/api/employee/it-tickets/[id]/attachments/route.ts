import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { parseAttachmentInput, ticketErrorResponse } from '@/app/api/_shared/it-tickets-http';
import { employeeActor, itTicketsService } from '@/app/api/employee/it-tickets/_lib';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/employee/it-tickets/[id]/attachments — own ticket only. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const attachments = await itTicketsService.listAttachments(employeeActor(auth.credential), id);
    return NextResponse.json({ success: true, data: attachments });
  } catch (error) {
    return ticketErrorResponse(error, 'employee list attachments');
  }
}

/** POST /api/employee/it-tickets/[id]/attachments — records a file already PUT to S3 via
 * /api/employee/it-tickets/presign. fileUrl must be on our own storage. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [body, badBody] = await parseJsonBody<{ fileName?: string; fileUrl?: string; fileSize?: number; mimeType?: string }>(request);
  if (badBody) return badBody;

  try {
    const attachment = await itTicketsService.addAttachment(employeeActor(auth.credential), id, parseAttachmentInput(body));
    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (error) {
    return ticketErrorResponse(error, 'employee add attachment');
  }
}
