import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { IT_TICKETS_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ItTicketsRepository } from '@/modules/it-tickets/repository/it-tickets.repository';
import { ItTicketsService } from '@/modules/it-tickets/service/it-tickets.service';
import { ticketErrorResponse, toActor } from '../../_shared/route-helpers';

const service = new ItTicketsService(new ItTicketsRepository());

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/it-tickets/[id]/comments */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const comments = await service.listComments(toActor(auth.user), id);
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    return ticketErrorResponse(error, 'list comments');
  }
}

/** POST /api/admin/it-tickets/[id]/comments */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, IT_TICKETS_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [body, badBody] = await parseJsonBody<{ body?: string }>(request);
  if (badBody) return badBody;

  try {
    const comment = await service.addComment(toActor(auth.user), id, body?.body ?? '');
    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    return ticketErrorResponse(error, 'add comment');
  }
}
