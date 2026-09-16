import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { IT_TICKETS_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ItTicketsRepository } from '@/modules/it-tickets/repository/it-tickets.repository';
import { ItTicketsService } from '@/modules/it-tickets/service/it-tickets.service';
import { parseAttachmentInput } from '@/app/api/_shared/it-tickets-http';
import { ticketErrorResponse, toActor } from '../../_shared/route-helpers';

const service = new ItTicketsService(new ItTicketsRepository());

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/it-tickets/[id]/attachments */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const attachments = await service.listAttachments(toActor(auth.user), id);
    return NextResponse.json({ success: true, data: attachments });
  } catch (error) {
    return ticketErrorResponse(error, 'list attachments');
  }
}

/**
 * POST /api/admin/it-tickets/[id]/attachments — records a file already uploaded to S3 via the
 * shared /api/admin/presign flow (client PUTs the bytes directly to S3, then calls this to persist
 * the metadata row). Body: { fileName, fileUrl, fileSize?, mimeType? }. fileUrl must be on our own
 * storage (parseAttachmentInput → assertAllowedFileUrl).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [body, badBody] = await parseJsonBody<{ fileName?: string; fileUrl?: string; fileSize?: number; mimeType?: string }>(request);
  if (badBody) return badBody;

  try {
    const attachment = await service.addAttachment(toActor(auth.user), id, parseAttachmentInput(body));
    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (error) {
    return ticketErrorResponse(error, 'add attachment');
  }
}
