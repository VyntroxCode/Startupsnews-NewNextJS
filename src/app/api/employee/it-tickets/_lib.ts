import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';
import { ItTicketsRepository } from '@/modules/it-tickets/repository/it-tickets.repository';
import { ItTicketsService } from '@/modules/it-tickets/service/it-tickets.service';
import { EMPLOYEE_TICKET_ROLE, type TicketActor } from '@/modules/it-tickets/domain/types';

export const itTicketsService = new ItTicketsService(new ItTicketsRepository());

/**
 * A signed-in plain employee as a ticket actor. Role 'employee' is not a manager, so the service
 * scopes them to tickets they reported (matched as the (credential id, 'employee') pair), lets them
 * edit summary/description only while the ticket is To Do, never lets them change status/assignee,
 * and only lets them delete their own comments and attachments.
 */
export function employeeActor(credential: HrEmployeeCredential): TicketActor {
  return { id: credential.id, role: EMPLOYEE_TICKET_ROLE, name: credential.name };
}
