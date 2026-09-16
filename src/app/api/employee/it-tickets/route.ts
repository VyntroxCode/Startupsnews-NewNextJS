import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ticketErrorResponse } from '@/app/api/_shared/it-tickets-http';
import type { CreateTicketDto, ItTicketFilters, ItTicketPriority, ItTicketStatus, ItTicketType } from '@/modules/it-tickets/domain/types';
import { employeeActor, itTicketsService } from '@/app/api/employee/it-tickets/_lib';

/** GET /api/employee/it-tickets — the signed-in employee's OWN tickets only. Scoping is done by the
 * service (non-manager actor → reporter = (credential id, 'employee')); assignee/"mine" filters don't apply. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const filters: ItTicketFilters = {};
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    if (status) filters.status = status as ItTicketStatus;
    if (priority) filters.priority = priority as ItTicketPriority;
    if (type) filters.type = type as ItTicketType;
    if (search) filters.search = search.slice(0, 200);

    const tickets = await itTicketsService.listTickets(employeeActor(auth.credential), filters);
    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    return ticketErrorResponse(error, 'employee list');
  }
}

/** POST /api/employee/it-tickets — raise a ticket. The service drops status/assignee for non-managers,
 * so every employee ticket starts in To Do and unassigned. */
export async function POST(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const [body, errorResponse] = await parseJsonBody<CreateTicketDto>(request);
  if (errorResponse) return errorResponse;

  try {
    const ticket = await itTicketsService.createTicket(employeeActor(auth.credential), body as CreateTicketDto);
    return NextResponse.json({ success: true, data: ticket }, { status: 201 });
  } catch (error) {
    return ticketErrorResponse(error, 'employee create');
  }
}
