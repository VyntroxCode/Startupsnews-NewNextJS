import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { IT_TICKETS_ROLES } from '@/shared/middleware/roles';
import { ItTicketsRepository } from '@/modules/it-tickets/repository/it-tickets.repository';
import { ItTicketsService } from '@/modules/it-tickets/service/it-tickets.service';
import { ticketErrorResponse, toActor } from '../../../_shared/route-helpers';

const service = new ItTicketsService(new ItTicketsRepository());

interface RouteParams {
  params: Promise<{ id: string; attachmentId: string }>;
}

/**
 * DELETE /api/admin/it-tickets/[id]/attachments/[attachmentId] — uploader (same id AND role) or a manage role.
 * Only removes the DB record; the S3 object is left in place (consistent with the rest of the app).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id, attachmentId } = await params;
  try {
    await service.deleteAttachment(toActor(auth.user), id, attachmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return ticketErrorResponse(error, 'delete attachment');
  }
}
