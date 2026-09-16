/**
 * Who may change a ticket's status, and to what. The single source of truth for both the service
 * (enforcement, 403 on violation) and the UI (disabled status options, refused board drops).
 *
 * Client-safe on purpose: imports only the role constants and the plain domain types — never a
 * repository, service or anything that touches the database.
 *
 * Rules:
 * - Leaving the status as it is is always fine.
 * - Only managers (admin, it_support) change status at all; reporters and employees never do.
 * - Moving a ticket INTO Blocked needs IT_TICKETS_BLOCK_ROLES (admin).
 * - Moving a ticket OUT of Blocked needs IT_TICKETS_UNBLOCK_ROLES (admin).
 */
import {
  IT_TICKETS_BLOCK_ROLES, IT_TICKETS_MANAGE_ROLES, IT_TICKETS_UNBLOCK_ROLES,
} from '@/shared/middleware/roles';
import type { ItTicketStatus } from './types';

function hasRole(list: readonly string[], role: string | null | undefined): boolean {
  return !!role && list.includes(role);
}

/** `from` is null when the ticket is being created (e.g. "+ Create" in a board column). */
export function canSetTicketStatus(role: string | null | undefined, from: ItTicketStatus | null, to: ItTicketStatus): boolean {
  if (from === to) return true;
  if (!hasRole(IT_TICKETS_MANAGE_ROLES, role)) return false;
  if (to === 'blocked' && !hasRole(IT_TICKETS_BLOCK_ROLES, role)) return false;
  if (from === 'blocked' && !hasRole(IT_TICKETS_UNBLOCK_ROLES, role)) return false;
  return true;
}

/** Plain-language reason shown in the 403 body and in the UI toast. */
export function statusDenialMessage(role: string | null | undefined, from: ItTicketStatus | null, to: ItTicketStatus): string {
  if (!hasRole(IT_TICKETS_MANAGE_ROLES, role)) return 'Only Admin or IT Support can change a ticket’s status.';
  if (to === 'blocked') return 'Only an Admin can move a ticket to Blocked.';
  if (from === 'blocked') return 'Only an Admin can move a ticket out of Blocked.';
  return 'You can’t make this status change.';
}
