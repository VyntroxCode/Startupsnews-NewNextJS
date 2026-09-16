import { PRIORITIES, PRIORITY_LABELS, STATUS_COLUMNS, STATUS_LABELS, TYPES, TYPE_LABELS } from './constants';
import { parseDbDate, todayIso } from './utils';
import type { ItTicket, ItTicketStatus, ItTicketType, TicketAssignee, TicketFilters } from './types';

/**
 * The numbers behind both the on-page Reports panel and the Excel export's Summary/Workload sheets.
 * One function, so the page and the downloaded file can never disagree for the same filters.
 */

export interface ReportSlice {
  key: string;
  label: string;
  count: number;
  /** #rrggbb */
  color: string;
}

export interface ReportBreakdown {
  id: 'status' | 'priority' | 'type' | 'assignee' | 'source' | 'due';
  title: string;
  slices: ReportSlice[];
  total: number;
}

export interface ReportKpi {
  id: string;
  label: string;
  value: number;
  hint?: string;
}

export interface WorkloadRow {
  assignee: string;
  counts: Record<ItTicketStatus, number>;
  total: number;
  overdue: number;
}

export interface TicketReport {
  total: number;
  kpis: ReportKpi[];
  breakdowns: ReportBreakdown[];
  workload: WorkloadRow[];
}

export const TYPE_COLORS: Record<ItTicketType, string> = {
  hardware: '#475569',
  software: '#7c3aed',
  access: '#f59e0b',
  network: '#0284c7',
  other: '#94a3b8',
};

const ASSIGNEE_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316'];
const UNASSIGNED_COLOR = '#cbd5e1';
const OTHERS_COLOR = '#64748b';
const MAX_ASSIGNEE_SLICES = 8;

const DONE: ItTicketStatus[] = ['resolved', 'closed'];

function isDone(t: ItTicket): boolean {
  return DONE.includes(t.status);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Whole days between two instants (never negative). */
export function daysBetween(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

export type DueHealth = 'done' | 'overdue' | 'soon' | 'later' | 'none';

export function dueHealth(t: ItTicket, today = todayIso()): DueHealth {
  if (isDone(t)) return 'done';
  const due = t.dueDate?.slice(0, 10);
  if (!due) return 'none';
  if (due < today) return 'overdue';
  if (due <= addDaysIso(today, 7)) return 'soon';
  return 'later';
}

export const DUE_HEALTH_META: Record<DueHealth, { label: string; color: string }> = {
  overdue: { label: 'Overdue', color: '#dc2626' },
  soon: { label: 'Due within 7 days', color: '#f59e0b' },
  later: { label: 'Due later', color: '#2563eb' },
  none: { label: 'No due date', color: '#94a3b8' },
  done: { label: 'Resolved / closed', color: '#16a34a' },
};

function emptyStatusCounts(): Record<ItTicketStatus, number> {
  return { open: 0, in_progress: 0, blocked: 0, resolved: 0, closed: 0 };
}

export function buildTicketReport(tickets: ItTicket[], now: Date = new Date()): TicketReport {
  const today = todayIso();
  const total = tickets.length;

  // ---- Status ----
  const statusSlices: ReportSlice[] = STATUS_COLUMNS.map((s) => ({
    key: s.key, label: s.label, color: s.color, count: tickets.filter((t) => t.status === s.key).length,
  }));
  const knownStatus = new Set<string>(STATUS_COLUMNS.map((s) => s.key));
  const strayStatus = tickets.filter((t) => !knownStatus.has(t.status)).length;
  if (strayStatus) statusSlices.push({ key: 'other', label: 'Other', color: '#a8a29e', count: strayStatus });

  // ---- Priority (most urgent first) ----
  const prioritySlices: ReportSlice[] = [...PRIORITIES].reverse().map((p) => ({
    key: p.key, label: p.label, color: p.color, count: tickets.filter((t) => t.priority === p.key).length,
  }));

  // ---- Type ----
  const typeSlices: ReportSlice[] = TYPES.map((ty) => ({
    key: ty.key, label: ty.label, color: TYPE_COLORS[ty.key], count: tickets.filter((t) => t.type === ty.key).length,
  }));

  // ---- Assignee (identity = id + role) ----
  const byAssignee = new Map<string, { name: string; count: number }>();
  let unassigned = 0;
  for (const t of tickets) {
    if (t.assigneeId == null || !t.assigneeRole) { unassigned++; continue; }
    const key = `${t.assigneeRole}:${t.assigneeId}`;
    const entry = byAssignee.get(key) ?? { name: t.assigneeName || 'Unknown', count: 0 };
    entry.count++;
    byAssignee.set(key, entry);
  }
  const ranked = [...byAssignee.entries()].sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name));
  const assigneeSlices: ReportSlice[] = ranked.slice(0, MAX_ASSIGNEE_SLICES).map(([key, v], i) => ({
    key, label: v.name, count: v.count, color: ASSIGNEE_PALETTE[i % ASSIGNEE_PALETTE.length],
  }));
  const othersCount = ranked.slice(MAX_ASSIGNEE_SLICES).reduce((sum, [, v]) => sum + v.count, 0);
  if (othersCount) assigneeSlices.push({ key: 'others', label: 'Others', count: othersCount, color: OTHERS_COLOR });
  assigneeSlices.push({ key: 'unassigned', label: 'Unassigned', count: unassigned, color: UNASSIGNED_COLOR });

  // ---- Where it was raised ----
  const fromEmployees = tickets.filter((t) => t.reporterRole === 'employee').length;
  const sourceSlices: ReportSlice[] = [
    { key: 'staff', label: 'Admin panel staff', count: total - fromEmployees, color: '#6366f1' },
    { key: 'employee', label: 'Employee portal', count: fromEmployees, color: '#f59e0b' },
  ];

  // ---- Due-date health ----
  const healthCounts: Record<DueHealth, number> = { overdue: 0, soon: 0, later: 0, none: 0, done: 0 };
  for (const t of tickets) healthCounts[dueHealth(t, today)]++;
  const dueSlices: ReportSlice[] = (['overdue', 'soon', 'later', 'none', 'done'] as DueHealth[]).map((h) => ({
    key: h, label: DUE_HEALTH_META[h].label, color: DUE_HEALTH_META[h].color, count: healthCounts[h],
  }));

  // ---- KPIs ----
  const openTickets = tickets.filter((t) => !isDone(t));
  const ages = openTickets
    .map((t) => daysBetween(parseDbDate(t.createdAt), now))
    .filter((d): d is number => d !== null);
  const avgOpenAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
  const resolveTimes = tickets
    .filter((t) => isDone(t) && t.resolvedAt)
    .map((t) => daysBetween(parseDbDate(t.createdAt), parseDbDate(t.resolvedAt)))
    .filter((d): d is number => d !== null);
  const avgResolve = resolveTimes.length ? Math.round(resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length) : 0;

  const kpis: ReportKpi[] = [
    { id: 'total', label: 'Total tickets', value: total },
    { id: 'open', label: 'Still open', value: openTickets.length, hint: 'To Do, In Progress or Blocked' },
    { id: 'blocked', label: 'Blocked', value: tickets.filter((t) => t.status === 'blocked').length },
    { id: 'overdue', label: 'Overdue', value: healthCounts.overdue },
    { id: 'unassigned', label: 'Unassigned & open', value: openTickets.filter((t) => t.assigneeId == null).length },
    { id: 'done', label: 'Resolved / closed', value: tickets.filter(isDone).length },
    { id: 'employee', label: 'From employees', value: fromEmployees },
    { id: 'age', label: 'Avg age of open tickets', value: avgOpenAge, hint: 'days' },
    { id: 'resolve', label: 'Avg time to resolve', value: avgResolve, hint: 'days' },
  ];

  // ---- Workload: assignee × status ----
  const workloadMap = new Map<string, WorkloadRow>();
  for (const t of tickets) {
    const key = t.assigneeId == null || !t.assigneeRole ? 'unassigned' : `${t.assigneeRole}:${t.assigneeId}`;
    const name = key === 'unassigned' ? 'Unassigned' : (t.assigneeName || 'Unknown');
    const row = workloadMap.get(key) ?? { assignee: name, counts: emptyStatusCounts(), total: 0, overdue: 0 };
    if (t.status in row.counts) row.counts[t.status]++;
    row.total++;
    if (dueHealth(t, today) === 'overdue') row.overdue++;
    workloadMap.set(key, row);
  }
  const workload = [...workloadMap.entries()]
    .sort(([ka, a], [kb, b]) => (ka === 'unassigned' ? 1 : kb === 'unassigned' ? -1 : b.total - a.total || a.assignee.localeCompare(b.assignee)))
    .map(([, row]) => row);

  const breakdowns: ReportBreakdown[] = [
    { id: 'status', title: 'By status', slices: statusSlices, total },
    { id: 'priority', title: 'By priority', slices: prioritySlices, total },
    { id: 'type', title: 'By issue type', slices: typeSlices, total },
    { id: 'assignee', title: 'By assignee', slices: assigneeSlices, total },
    { id: 'source', title: 'Where it was raised', slices: sourceSlices, total },
    { id: 'due', title: 'Due-date health', slices: dueSlices, total },
  ];

  return { total, kpis, breakdowns, workload };
}

/** Plain-language description of the active filters, e.g. "Status: Blocked · Search "vpn"". */
export function describeFilters(filters: TicketFilters, assignees: TicketAssignee[]): string {
  const parts: string[] = [];
  if (filters.search) parts.push(`Search "${filters.search}"`);
  if (filters.status) parts.push(`Status: ${STATUS_LABELS[filters.status]}`);
  if (filters.priority) parts.push(`Priority: ${PRIORITY_LABELS[filters.priority]}`);
  if (filters.type) parts.push(`Type: ${TYPE_LABELS[filters.type]}`);
  if (filters.assigneeId && filters.assigneeRole) {
    const a = assignees.find((x) => x.id === filters.assigneeId && x.role === filters.assigneeRole);
    parts.push(`Assignee: ${a?.name ?? 'selected person'}`);
  }
  if (filters.mine) parts.push('Only my tickets');
  return parts.length ? parts.join(' · ') : 'None — all tickets';
}
