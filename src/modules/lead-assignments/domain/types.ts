/** Which employees a Sales Tracker lead is assigned to, and which HR departments were picked on it
 * (tables: sales_lead_assignments + sales_lead_departments, see scripts/migrations/add-sales-lead-assignments.sql).
 *
 * Plain data with no server imports: the admin Sales Tracker and the employee "My Leads" page both
 * import this file directly. */

/** The two tables the "All leads" table draws from: 'lead' = sales_leads, 'ens' =
 * ens_travel_enquiries. Together with the lead's id this is the assignment's key. */
export const LEAD_SOURCES = ['lead', 'ens'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export function isLeadSource(value: unknown): value is LeadSource {
  return typeof value === 'string' && (LEAD_SOURCES as readonly string[]).includes(value);
}

/** THE lead status — one per lead, shared by the admin Sales Tracker and the employee's My Leads
 * (since 2026-09-29). The same four everywhere: Pending, Follow Up, Confirmed, Not Interested.
 *
 * Where it's stored depends on the lead's table, each keeping its own historical encoding:
 *  - sales_leads.status holds the LABEL ("Follow Up") — the admin lead window and filters read it;
 *  - ens_travel_enquiries.lead_status holds its older codes (NULL / followed-up / confirmed /
 *    cancelled — see ens-travel-enquiries/domain/lead-status.ts).
 * Code everywhere else uses `value` below and converts at the edges with the helpers here. An
 * employee's follow-up writes the lead's status (see lead-followups); the admin edits it in the lead
 * window. Every follow-up also keeps the status picked with it, as history.
 *
 * The names keep their old ASSIGNMENT_ prefix (this used to be each employee's own status on
 * sales_lead_assignments.status — that column is no longer read or shown). */
export const ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', tone: 'amber', ens: null },
  { value: 'follow-up', label: 'Follow Up', tone: 'blue', ens: 'followed-up' },
  { value: 'confirmed', label: 'Confirmed', tone: 'green', ens: 'confirmed' },
  { value: 'not-interested', label: 'Not Interested', tone: 'red', ens: 'cancelled' },
] as const satisfies readonly { value: string; label: string; tone: string; ens: string | null }[];

export type AssignmentStatus = (typeof ASSIGNMENT_STATUS_OPTIONS)[number]['value'];

export const ASSIGNMENT_STATUS_PENDING: AssignmentStatus = 'pending';

/** Done with: counted only in totals (My Leads cards), hidden from a page card's open-leads list. */
export const FINISHED_LEAD_STATUSES: readonly AssignmentStatus[] = ['confirmed', 'not-interested'];

/** The four labels, in order — what sales_leads.status stores and the admin dropdowns offer. */
export const SALES_LEAD_STATUS_LABELS: readonly string[] = ASSIGNMENT_STATUS_OPTIONS.map((o) => o.label);

export function assignmentStatusLabel(value: string): string {
  return ASSIGNMENT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** sales_leads.status (a label) → value. Anything else (a pre-2026-09-29 status such as "Query
 * received", or empty) reads as Pending. */
export function statusFromSalesLead(label: string | null | undefined): AssignmentStatus {
  const l = (label || '').trim().toLowerCase();
  return ASSIGNMENT_STATUS_OPTIONS.find((o) => o.label.toLowerCase() === l)?.value ?? ASSIGNMENT_STATUS_PENDING;
}

/** ens_travel_enquiries.lead_status → value (NULL = Pending). */
export function statusFromEns(code: string | null | undefined): AssignmentStatus {
  return ASSIGNMENT_STATUS_OPTIONS.find((o) => o.ens !== null && o.ens === code)?.value ?? ASSIGNMENT_STATUS_PENDING;
}

/** value → ens_travel_enquiries.lead_status. */
export function ensCodeFor(value: AssignmentStatus): string | null {
  return ASSIGNMENT_STATUS_OPTIONS.find((o) => o.value === value)?.ens ?? null;
}

/** What an employee can pick with a follow-up — all four, same as the admin. */
export const PICKABLE_ASSIGNMENT_STATUSES = ASSIGNMENT_STATUS_OPTIONS;

export function isPickableAssignmentStatus(value: unknown): value is AssignmentStatus {
  return typeof value === 'string' && PICKABLE_ASSIGNMENT_STATUSES.some((o) => o.value === value);
}

/** Tailwind classes for a status chip (My Leads). Written out in full so Tailwind's scanner finds
 * them. */
const STATUS_CHIP_CLASSES: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-700',
  slate: 'bg-slate-200 text-slate-700',
};

export function assignmentStatusChipClass(value: string): string {
  const tone = ASSIGNMENT_STATUS_OPTIONS.find((o) => o.value === value)?.tone ?? 'slate';
  return STATUS_CHIP_CLASSES[tone];
}

/** Plain colours for the same chips in the admin Sales Tracker, which styles with its own CSS
 * rather than Tailwind: [background, text], keyed by value. */
export const ASSIGNMENT_STATUS_COLORS: Record<string, [string, string]> = {
  pending: ['#FEF3C7', '#92400E'],
  'follow-up': ['#DBEAFE', '#1E40AF'],
  confirmed: ['#D1FAE5', '#065F46'],
  'not-interested': ['#FEE2E2', '#B91C1C'],
};

/** An employee who can be picked in the Sales Tracker: an active HR login whose Directory record
 * (if any) isn't marked exited. `credentialId` is what gets stored; the name is what the admin sees.
 * `department` is their Directory record's team, '' when they have none (or no Directory record). */
export interface AssignableEmployee {
  credentialId: number;
  employeeCode: string;
  name: string;
  designation: string;
  department: string;
}

/** A department the Departments dropdown offers: an HR team with at least one assignable employee.
 * `withoutLogin` counts active Directory members in it who have no HR login, so can't be assigned. */
export interface DepartmentOption {
  name: string;
  memberCount: number;
  withoutLogin: number;
}

/** Longest department name, and most departments, one lead accepts. */
export const DEPARTMENT_NAME_MAX_LENGTH = 255;
export const MAX_DEPARTMENTS_PER_LEAD = 50;

/** One employee on a lead. */
export interface Assignee {
  credentialId: number;
  /** From the HR login at read time, so a renamed employee shows their current name. Empty if the
   * login has since been deleted. */
  employeeName: string;
  employeeCode: string;
  /** False once the login is deactivated or the person is marked exited — they keep the lead
   * until someone removes them, but can't be newly added. */
  active: boolean;
  /** The department they were added through; null = picked by hand. */
  viaDepartment: string | null;
  status: AssignmentStatus;
  /** This person's own next follow-up date on the lead (YYYY-MM-DD), set by the follow-up they log
   * from My Leads; '' until they set one. See lead-followups/domain/follow-up-date.ts. */
  nextFollowUpDate: string;
  assignedAt: string;
  assignedBy: string;
}

/** Everything assigned on one lead, as the admin Sales Tracker sees it. */
export interface LeadAssignment {
  source: LeadSource;
  leadId: string;
  departments: string[];
  assignees: Assignee[];
  /** Follow-ups the assignees have logged on this lead (see modules/lead-followups). */
  followUpCount?: number;
}

/** What the lead window edits and sends: the picked departments and the people, each with the
 * department they came through (null = by hand). */
export interface LeadAssignmentDraft {
  departments: string[];
  assignees: { credentialId: number; viaDepartment: string | null }[];
}

export const EMPTY_ASSIGNMENT_DRAFT: LeadAssignmentDraft = { departments: [], assignees: [] };

export function assignmentToDraft(a: LeadAssignment | undefined): LeadAssignmentDraft {
  if (!a) return EMPTY_ASSIGNMENT_DRAFT;
  return {
    departments: [...a.departments],
    assignees: a.assignees.map((p) => ({ credentialId: p.credentialId, viaDepartment: p.viaDepartment })),
  };
}

/** True when two drafts would store the same thing (order doesn't matter). */
export function sameAssignmentDraft(a: LeadAssignmentDraft, b: LeadAssignmentDraft): boolean {
  const deps = (d: LeadAssignmentDraft) => [...d.departments].sort().join('\n');
  const people = (d: LeadAssignmentDraft) => d.assignees.map((p) => `${p.credentialId}:${p.viaDepartment ?? ''}`).sort().join('\n');
  return deps(a) === deps(b) && people(a) === people(b);
}

/** One lead on the employee's "My Leads" page: enough to know who it is, where it came from and how
 * to reach them. */
export interface AssignedLead {
  source: LeadSource;
  leadId: string;
  /** The lead's page key: sales_leads.type for a 'lead' row (a page type such as
   * "Feature Page Leads", or a manual channel such as "Social Media"), or
   * "Expand North Star Enquiry" for an 'ens' row. */
  page: string;
  /** The day the lead arrived (YYYY-MM-DD). */
  leadDate: string;
  name: string;
  company: string;
  contact: string;
  email: string;
  city: string;
  country: string;
  /** What they asked for: the lead's query text, or an Expand North Star enquiry's requirement. */
  query: string;
  status: AssignmentStatus;
  assignedAt: string;
  assignedBy: string;
  /** Follow-ups logged on this lead by anyone assigned to it, and when the latest was added. */
  followUpCount: number;
  lastFollowUpAt: string;
  /** The reader's own next follow-up date on this lead (YYYY-MM-DD); '' until they set one. */
  nextFollowUpDate: string;
  /** Admin replies on this lead the reader hasn't seen yet (cleared when they open the lead). */
  unreadReplies: number;
}

export interface LeadAssigneeEntity {
  lead_source: string;
  lead_id: string;
  credential_id: number;
  via_department: string | null;
  status: string;
  next_follow_up_date: string | null;
  assigned_by: string | null;
  assigned_at: string;
  employee_name: string | null;
  employee_code: string | null;
  /** 1 when the login is still assignable (active, not exited). */
  is_active: number;
}

export interface LeadDepartmentEntity {
  lead_source: string;
  lead_id: string;
  department: string;
}
