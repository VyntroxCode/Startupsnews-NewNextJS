import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { IT_TICKETS_MANAGE_ROLES } from '@/shared/middleware/roles';
import { ItTicketsRepository } from '@/modules/it-tickets/repository/it-tickets.repository';
import { ItTicketsService } from '@/modules/it-tickets/service/it-tickets.service';
import { parseTicketFilters, ticketErrorResponse, toActor } from '../_shared/route-helpers';

const service = new ItTicketsService(new ItTicketsRepository());

/**
 * GET /api/admin/it-tickets/export — data for the Excel export: the tickets matching the same query
 * filters as the board (status, priority, type, assignee, search, mine) plus every comment and
 * attachment on them. Admin / IT Support only. The workbook itself (sheets + native pie charts) is built
 * in the browser (components/admin/it-tickets/excel-export.ts).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, IT_TICKETS_MANAGE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await service.exportTickets(toActor(auth.user), parseTicketFilters(request.nextUrl.searchParams));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return ticketErrorResponse(error, 'export');
  }
}
