import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { IT_TICKETS_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ItTicketsRepository } from '@/modules/it-tickets/repository/it-tickets.repository';
import { ItTicketsService } from '@/modules/it-tickets/service/it-tickets.service';
import type { CreateTicketDto } from '@/modules/it-tickets/domain/types';
import { parseTicketFilters, ticketErrorResponse, toActor } from './_shared/route-helpers';

const service = new ItTicketsService(new ItTicketsRepository());

/** GET /api/admin/it-tickets — list. Non-manage roles are auto-scoped to their own tickets in the service. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const tickets = await service.listTickets(toActor(auth.user), parseTicketFilters(request.nextUrl.searchParams));
    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    return ticketErrorResponse(error, 'list');
  }
}

/** POST /api/admin/it-tickets — create. Reporter is always the caller. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const [body, errorResponse] = await parseJsonBody<CreateTicketDto>(request);
  if (errorResponse) return errorResponse;

  try {
    const ticket = await service.createTicket(toActor(auth.user), body as CreateTicketDto);
    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    return ticketErrorResponse(error, 'create');
  }
}
