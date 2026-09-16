import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { IT_TICKETS_DELETE_ROLES, IT_TICKETS_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ItTicketsRepository } from '@/modules/it-tickets/repository/it-tickets.repository';
import { ItTicketsService } from '@/modules/it-tickets/service/it-tickets.service';
import type { UpdateTicketDto } from '@/modules/it-tickets/domain/types';
import { ticketErrorResponse, toActor } from '../_shared/route-helpers';

const service = new ItTicketsService(new ItTicketsRepository());

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/it-tickets/[id] — `id` may be the uuid or the human key (`IT-12`) for deep links. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const ticket = await service.getTicket(toActor(auth.user), id);
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    return ticketErrorResponse(error, 'get');
  }
}

/** PUT /api/admin/it-tickets/[id] — status/priority/assignee changes (incl. Kanban drag) go through here. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [body, badBody] = await parseJsonBody<UpdateTicketDto>(request);
  if (badBody) return badBody;

  try {
    const ticket = await service.updateTicket(toActor(auth.user), id, body as UpdateTicketDto);
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    return ticketErrorResponse(error, 'update');
  }
}

/** DELETE /api/admin/it-tickets/[id] — IT_TICKETS_DELETE_ROLES only (super admin). */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, IT_TICKETS_DELETE_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    await service.deleteTicket(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return ticketErrorResponse(error, 'delete');
  }
}
