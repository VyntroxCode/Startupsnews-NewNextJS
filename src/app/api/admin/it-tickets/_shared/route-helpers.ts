import type { AuthUser } from '@/shared/middleware/auth.middleware';
import type {
  ItTicketFilters, ItTicketPriority, ItTicketStatus, ItTicketType, TicketActor,
} from '@/modules/it-tickets/domain/types';

// Shared with the employee-portal routes — see src/app/api/_shared/it-tickets-http.ts.
export { ticketErrorResponse } from '@/app/api/_shared/it-tickets-http';

/** The (id, role, name) triple every service call needs — role is part of identity, see domain/types.ts. */
export function toActor(user: AuthUser): TicketActor {
  return { id: user.id, role: user.role, name: user.name };
}

/** Admin list filters from the query string — shared by GET /api/admin/it-tickets and the Excel
 * export, so an export always matches what the board shows for the same filters. */
export function parseTicketFilters(searchParams: URLSearchParams): ItTicketFilters {
  const filters: ItTicketFilters = {};
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const type = searchParams.get('type');
  const assigneeId = searchParams.get('assigneeId');
  const assigneeRole = searchParams.get('assigneeRole');
  const search = searchParams.get('search');
  const mine = searchParams.get('mine');
  if (status) filters.status = status as ItTicketStatus;
  if (priority) filters.priority = priority as ItTicketPriority;
  if (type) filters.type = type as ItTicketType;
  // Assignee identity is the (id, role) pair — ids overlap across users/panel_admins.
  if (assigneeId && assigneeRole) {
    const id = parseInt(assigneeId, 10);
    if (!isNaN(id)) {
      filters.assigneeId = id;
      filters.assigneeRole = assigneeRole;
    }
  }
  if (search) filters.search = search.slice(0, 200);
  if (mine === '1' || mine === 'true') filters.mine = true;
  return filters;
}
