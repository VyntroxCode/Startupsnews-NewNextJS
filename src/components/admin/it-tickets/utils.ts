import { PRIORITY_RANK, STATUS_RANK } from './constants';
import type { ItTicket, TicketDraft, TicketSort } from './types';

export function emptyDraft(): TicketDraft {
  return {
    title: '',
    description: '',
    priority: 'medium',
    type: 'other',
    dueDate: '',
    assigneeId: null,
    assigneeRole: null,
    assigneeName: null,
  };
}

export function ticketToDraft(ticket: ItTicket): TicketDraft {
  return {
    title: ticket.title,
    description: ticket.description ?? '',
    priority: ticket.priority,
    type: ticket.type,
    dueDate: ticket.dueDate ?? '',
    assigneeId: ticket.assigneeId,
    assigneeRole: ticket.assigneeRole,
    assigneeName: ticket.assigneeName,
  };
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Literal class pairs (Tailwind's scanner needs to see them) — picked deterministically per name so
 * the same person always gets the same colour across cards, chips and comments. */
const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

export function avatarColor(name: string | null | undefined): string {
  const s = (name ?? '').trim().toLowerCase();
  if (!s) return 'bg-slate-100 text-slate-400';
  let hash = 5381;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * The API hands us three shapes: `YYYY-MM-DD` (DATE columns), `YYYY-MM-DD HH:mm:ss` (TIMESTAMP
 * columns — the mariadb pool runs with dateStrings:true in the +05:30 session timezone, and the
 * space-separated form is not ISO so Safari refuses it) and full ISO strings. Normalise before
 * `new Date()` so every browser agrees on the instant.
 */
export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  let s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    s = `${s}T00:00:00`; // local midnight — a due date is a calendar day, not an instant
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)) {
    s = `${s.replace(' ', 'T')}+05:30`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  const d = parseDbDate(value);
  if (!d) return '';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "just now", "5m ago", "3h ago", "2d ago", then the plain date — Jira's activity-feed style. */
export function relativeTime(value: string | null | undefined, now: number = Date.now()): string {
  const d = parseDbDate(value);
  if (!d) return '';
  const diff = Math.max(0, now - d.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(value);
}

/** Today's calendar date as `YYYY-MM-DD` in the viewer's local time. */
export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Overdue = due day is before today and the ticket is still open. Compared as calendar days so a
 * ticket due today is not "overdue" at 00:01. */
export function isOverdue(ticket: Pick<ItTicket, 'dueDate' | 'status'>): boolean {
  if (!ticket.dueDate || ticket.status === 'resolved' || ticket.status === 'closed') return false;
  const due = ticket.dueDate.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(due) && due < todayIso();
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Share/deep-link URL for a ticket: the board with `?ticket=IT-12`. */
export function ticketPermalink(ticketKey: string, pathname = '/admin/it-tickets'): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}${pathname}?ticket=${encodeURIComponent(ticketKey)}`;
}

function ticketNumber(key: string): number {
  const n = parseInt(key.replace(/^\D+/, ''), 10);
  return Number.isNaN(n) ? 0 : n;
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base' });
}

/** Client-side sort for the list view. Empty assignee/due values always sink to the bottom. */
export function sortTickets(tickets: ItTicket[], sort: TicketSort): ItTicket[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  const sorted = [...tickets];
  sorted.sort((a, b) => {
    switch (sort.key) {
      case 'key':
        return (ticketNumber(a.ticketKey) - ticketNumber(b.ticketKey)) * dir;
      case 'title':
        return compareStrings(a.title, b.title) * dir;
      case 'priority':
        return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * dir;
      case 'status':
        return (STATUS_RANK[a.status] - STATUS_RANK[b.status]) * dir;
      case 'assignee':
        if (!a.assigneeName && b.assigneeName) return 1;
        if (a.assigneeName && !b.assigneeName) return -1;
        return compareStrings(a.assigneeName, b.assigneeName) * dir;
      case 'reporter':
        return compareStrings(a.reporterName, b.reporterName) * dir;
      case 'created':
        return ((parseDbDate(a.createdAt)?.getTime() ?? 0) - (parseDbDate(b.createdAt)?.getTime() ?? 0)) * dir;
      case 'due':
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && !b.dueDate) return -1;
        return compareStrings(a.dueDate, b.dueDate) * dir;
      default:
        return 0;
    }
  });
  return sorted;
}
