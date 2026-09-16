import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ticketErrorResponse } from '@/app/api/_shared/it-tickets-http';
import { employeeActor, itTicketsService } from '@/app/api/employee/it-tickets/_lib';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/employee/it-tickets/[id]/comments — own ticket only (service enforces view access). */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const comments = await itTicketsService.listComments(employeeActor(auth.credential), id);
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    return ticketErrorResponse(error, 'employee list comments');
  }
}

/** POST /api/employee/it-tickets/[id]/comments — { body }. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [body, badBody] = await parseJsonBody<{ body?: string }>(request);
  if (badBody) return badBody;

  try {
    const comment = await itTicketsService.addComment(employeeActor(auth.credential), id, body?.body ?? '');
    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    return ticketErrorResponse(error, 'employee add comment');
  }
}
