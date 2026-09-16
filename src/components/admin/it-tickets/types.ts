export type ItTicketStatus = 'open' | 'in_progress' | 'blocked' | 'resolved' | 'closed';
export type ItTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ItTicketType = 'hardware' | 'software' | 'access' | 'network' | 'other';

/** Client mirror of modules/it-tickets/domain/types.ts `ItTicket` — keep the two in step. */
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

export interface TicketDraft {
  title: string;
  description: string;
  /** Managers only — set when the create dialog is opened from a board column's "+ Create". */
  status?: ItTicketStatus;
  priority: ItTicketPriority;
  type: ItTicketType;
  dueDate: string;
  assigneeId: number | null;
  assigneeRole: string | null;
  assigneeName: string | null;
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

/** A person a ticket can be assigned to. `role` is part of identity — ids overlap across the two staff tables. */
export interface TicketAssignee {
  id: number;
  role: string;
  name: string;
}

/** Response of GET /api/admin/it-tickets/export. */
export interface ItTicketExport {
  tickets: ItTicket[];
  comments: ItTicketComment[];
  attachments: ItTicketAttachment[];
  generatedAt: string;
}

export type TicketViewMode = 'board' | 'list';

export interface TicketFilters {
  status?: ItTicketStatus;
  priority?: ItTicketPriority;
  type?: ItTicketType;
  assigneeId?: number;
  assigneeRole?: string;
  search?: string;
  /** "Only my tickets" — server scopes to tickets the caller reported. */
  mine?: boolean;
}

export type TicketSortKey = 'key' | 'title' | 'priority' | 'status' | 'assignee' | 'reporter' | 'created' | 'due';

export interface TicketSort {
  key: TicketSortKey;
  dir: 'asc' | 'desc';
}
