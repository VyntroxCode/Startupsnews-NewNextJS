/**
 * IT Ticket Management domain types — a Jira-style helpdesk queue shared by every
 * admin-panel role. Anyone can raise a ticket (reporter); only `admin`/`it_support`
 * (IT_TICKETS_MANAGE_ROLES) triage the full queue. Reporter/assignee identity may live
 * in the `users` table, the `panel_admins` table, or — for tickets raised from the employee portal —
 * the `hr_employee_credentials` table (role EMPLOYEE_TICKET_ROLE), so role is stored alongside
 * id and the display name is denormalized to avoid cross-table joins on every list.
 *
 * INVARIANT: because `users.id` and `panel_admins.id` are independent sequences that
 * overlap (users#1 and panel_admins#1 both exist), a person is ALWAYS identified by the
 * (id, role) pair — never by the numeric id alone. See `isSameActor` in the service.
 */

export type ItTicketStatus = 'open' | 'in_progress' | 'blocked' | 'resolved' | 'closed';
export type ItTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ItTicketType = 'hardware' | 'software' | 'access' | 'network' | 'other';

export const IT_TICKET_STATUSES: ItTicketStatus[] = ['open', 'in_progress', 'blocked', 'resolved', 'closed'];
export const IT_TICKET_PRIORITIES: ItTicketPriority[] = ['low', 'medium', 'high', 'urgent'];
export const IT_TICKET_TYPES: ItTicketType[] = ['hardware', 'software', 'access', 'network', 'other'];

/** Actor role for plain HR employees (employee portal). Its id is `hr_employee_credentials.id`, which
 * overlaps with users/panel_admins ids — so, like every actor, it is only ever matched as (id, role).
 * Not a manager: the service scopes it to its own tickets. */
export const EMPLOYEE_TICKET_ROLE = 'employee';

export const IT_TICKET_TITLE_MAX = 255;
export const IT_TICKET_BODY_MAX = 10000;

export interface ItTicketEntity {
  id: string;
  ticket_key: string;
  title: string;
  description: string | null;
  status: ItTicketStatus;
  priority: ItTicketPriority;
  type: ItTicketType;
  reporter_id: number;
  reporter_role: string;
  reporter_name: string;
  assignee_id: number | null;
  assignee_role: string | null;
  assignee_name: string | null;
  due_date: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  /** Correlated-subquery counts from TICKET_SELECT; the mariadb driver returns COUNT() as bigint. */
  comment_count?: number | bigint;
  attachment_count?: number | bigint;
}

export interface ItTicket {
  id: string;
  ticketKey: string;
  title: string;
  description: string | null;
  status: ItTicketStatus;
  priority: ItTicketPriority;
  type: ItTicketType;
  reporterId: number;
  reporterRole: string;
  reporterName: string;
  assigneeId: number | null;
  assigneeRole: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  attachmentCount: number;
}

export interface ItTicketFilters {
  status?: ItTicketStatus;
  priority?: ItTicketPriority;
  type?: ItTicketType;
  /** Assignee is matched as an (id, role) pair — both must be present for the filter to apply. */
  assigneeId?: number;
  assigneeRole?: string;
  search?: string;
  /** Scopes the query to only tickets this person reported — applied by the service for non-manage
   * roles, or for managers who ask for "only my tickets" via `mine`. Matched as an (id, role) pair. */
  reporterId?: number;
  reporterRole?: string;
  mine?: boolean;
}

export interface CreateTicketDto {
  title: string;
  description?: string;
  /** Managers may create a ticket directly in a column (board footer "+ Create"); others always start open. */
  status?: ItTicketStatus;
  priority?: ItTicketPriority;
  type?: ItTicketType;
  dueDate?: string | null;
  assigneeId?: number | null;
  assigneeRole?: string | null;
  assigneeName?: string | null;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  status?: ItTicketStatus;
  priority?: ItTicketPriority;
  type?: ItTicketType;
  dueDate?: string | null;
  assigneeId?: number | null;
  assigneeRole?: string | null;
  assigneeName?: string | null;
}

export interface ItTicketCommentEntity {
  id: string;
  ticket_id: string;
  author_id: number;
  author_role: string;
  author_name: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface ItTicketComment {
  id: string;
  ticketId: string;
  authorId: number;
  authorRole: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItTicketAttachmentEntity {
  id: string;
  ticket_id: string;
  uploaded_by_id: number;
  uploaded_by_role: string;
  uploaded_by_name: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface ItTicketAttachment {
  id: string;
  ticketId: string;
  uploadedById: number;
  uploadedByRole: string;
  uploadedByName: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

/** Everything the Excel export needs in one response: the filtered tickets plus every comment and
 * attachment on them. Managers only. */
export interface ItTicketExport {
  tickets: ItTicket[];
  comments: ItTicketComment[];
  attachments: ItTicketAttachment[];
  generatedAt: string;
}

/** The identity of the caller, as the service needs it for scoping/permission checks. */
export interface TicketActor {
  id: number;
  role: string;
  name: string;
}
