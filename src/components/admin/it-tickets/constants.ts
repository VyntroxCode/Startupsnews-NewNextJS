import { IT_TICKETS_DELETE_ROLES, IT_TICKETS_MANAGE_ROLES } from '@/shared/middleware/roles';
import type { ItTicketPriority, ItTicketStatus, ItTicketType } from './types';

/** Shown as the Jira-style "project" in breadcrumbs and the create dialog. */
export const PROJECT_NAME = 'IT Support';

/** Who triages the queue / who may delete — the single server-side source, re-exported so the
 * client never carries its own copy of a role list. */
export const MANAGE_ROLES: readonly string[] = IT_TICKETS_MANAGE_ROLES;
export const DELETE_ROLES: readonly string[] = IT_TICKETS_DELETE_ROLES;

export interface StatusMeta {
  key: ItTicketStatus;
  label: string;
  /** Column-header dot colour. */
  color: string;
  /** Jira-style lozenge classes — literal strings so Tailwind's scanner sees them. */
  lozenge: string;
  /** Column header tint for the board. */
  column: string;
  rank: number;
}

export const STATUS_COLUMNS: StatusMeta[] = [
  { key: 'open', label: 'To Do', color: '#64748b', lozenge: 'bg-slate-200 text-slate-700', column: 'text-slate-600', rank: 0 },
  { key: 'in_progress', label: 'In Progress', color: '#2563eb', lozenge: 'bg-blue-100 text-blue-800', column: 'text-blue-700', rank: 1 },
  { key: 'blocked', label: 'Blocked', color: '#dc2626', lozenge: 'bg-red-100 text-red-800', column: 'text-red-700', rank: 2 },
  { key: 'resolved', label: 'Resolved', color: '#16a34a', lozenge: 'bg-emerald-100 text-emerald-800', column: 'text-emerald-700', rank: 3 },
  { key: 'closed', label: 'Closed', color: '#0f172a', lozenge: 'bg-slate-800 text-white', column: 'text-slate-800', rank: 4 },
];

export const STATUS_META: Record<ItTicketStatus, StatusMeta> = STATUS_COLUMNS.reduce(
  (acc, s) => ({ ...acc, [s.key]: s }),
  {} as Record<ItTicketStatus, StatusMeta>
);

export const STATUS_LABELS: Record<ItTicketStatus, string> = STATUS_COLUMNS.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.label }),
  {} as Record<ItTicketStatus, string>
);

export const STATUS_COLORS: Record<ItTicketStatus, string> = STATUS_COLUMNS.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.color }),
  {} as Record<ItTicketStatus, string>
);

export const STATUS_RANK: Record<ItTicketStatus, number> = STATUS_COLUMNS.reduce(
  (acc, s) => ({ ...acc, [s.key]: s.rank }),
  {} as Record<ItTicketStatus, number>
);

export interface PriorityMeta {
  key: ItTicketPriority;
  label: string;
  color: string;
  /** Icon colour class (literal for the Tailwind scanner). */
  iconClass: string;
  rank: number;
}

/** Ordered lowest → highest; `rank` sorts highest first when descending. */
export const PRIORITIES: PriorityMeta[] = [
  { key: 'low', label: 'Low', color: '#16a34a', iconClass: 'text-emerald-600', rank: 0 },
  { key: 'medium', label: 'Medium', color: '#d97706', iconClass: 'text-amber-500', rank: 1 },
  { key: 'high', label: 'High', color: '#ea580c', iconClass: 'text-orange-600', rank: 2 },
  { key: 'urgent', label: 'Urgent', color: '#dc2626', iconClass: 'text-red-600', rank: 3 },
];

export const PRIORITY_META: Record<ItTicketPriority, PriorityMeta> = PRIORITIES.reduce(
  (acc, p) => ({ ...acc, [p.key]: p }),
  {} as Record<ItTicketPriority, PriorityMeta>
);

export const PRIORITY_LABELS: Record<ItTicketPriority, string> = PRIORITIES.reduce(
  (acc, p) => ({ ...acc, [p.key]: p.label }),
  {} as Record<ItTicketPriority, string>
);

export const PRIORITY_COLORS: Record<ItTicketPriority, string> = PRIORITIES.reduce(
  (acc, p) => ({ ...acc, [p.key]: p.color }),
  {} as Record<ItTicketPriority, string>
);

export const PRIORITY_RANK: Record<ItTicketPriority, number> = PRIORITIES.reduce(
  (acc, p) => ({ ...acc, [p.key]: p.rank }),
  {} as Record<ItTicketPriority, number>
);

export interface TypeMeta {
  key: ItTicketType;
  label: string;
  /** Jira issue-type style: a small filled rounded square with a white glyph. */
  tileClass: string;
}

export const TYPES: TypeMeta[] = [
  { key: 'hardware', label: 'Hardware', tileClass: 'bg-slate-600' },
  { key: 'software', label: 'Software', tileClass: 'bg-violet-600' },
  { key: 'access', label: 'Access Request', tileClass: 'bg-amber-500' },
  { key: 'network', label: 'Network', tileClass: 'bg-sky-600' },
  { key: 'other', label: 'Other', tileClass: 'bg-slate-400' },
];

export const TYPE_META: Record<ItTicketType, TypeMeta> = TYPES.reduce(
  (acc, t) => ({ ...acc, [t.key]: t }),
  {} as Record<ItTicketType, TypeMeta>
);

export const TYPE_LABELS: Record<ItTicketType, string> = TYPES.reduce(
  (acc, t) => ({ ...acc, [t.key]: t.label }),
  {} as Record<ItTicketType, string>
);

/** Summary length cap — mirrors IT_TICKET_TITLE_MAX on the server (VARCHAR(255)). */
export const TITLE_MAX = 255;
