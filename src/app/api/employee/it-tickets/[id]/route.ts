import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ticketErrorResponse } from '@/app/api/_shared/it-tickets-http';
import type { UpdateTicketDto } from '@/modules/it-tickets/domain/types';
import { employeeActor, itTicketsService } from '@/app/api/employee/it-tickets/_lib';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/employee/it-tickets/[id] — uuid or `IT-12`. 403 unless the employee reported it. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const ticket = await itTicketsService.getTicket(employeeActor(auth.credential), id);
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    return ticketErrorResponse(error, 'employee get');
  }
}

/** PUT /api/employee/it-tickets/[id] — own ticket, summary/description only, while it is still To Do.
 * Deliberately no DELETE export: employees cannot delete tickets (Next answers 405). */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [body, badBody] = await parseJsonBody<UpdateTicketDto>(request);
  if (badBody) return badBody;

  try {
    const ticket = await itTicketsService.updateTicket(employeeActor(auth.credential), id, body as UpdateTicketDto);
    return NextResponse.json({ success: true, data: ticket });
  } catch (error) {
    return ticketErrorResponse(error, 'employee update');
  }
}
