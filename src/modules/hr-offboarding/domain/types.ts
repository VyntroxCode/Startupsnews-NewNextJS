/**
 * Offboarding — one case per exit. hr_offboarding is the source of truth for exit state and for
 * portal access after the last working day (LWD); hr_employees.status is only a display mirror.
 * See scripts/migrations/add-hr-offboarding.sql for why nothing lives on hr_employees.
 *
 * Lifecycle:
 *   pending (employee resigned) → accepted (serving notice) → exited (LWD passed) → completed
 *   side exits: withdrawn (employee, pending only) · rejected (HR, pending only) · cancelled (HR, accepted only)
 * A termination by HR is created already `accepted` — or `exited` when immediate.
 */

import { addDaysUTC } from '@/modules/hr-tool/utils/time';

export type OffboardingExitType = 'resignation' | 'termination';
export type OffboardingInitiator = 'employee' | 'admin';
export type OffboardingStatus = 'pending' | 'accepted' | 'exited' | 'completed' | 'rejected' | 'withdrawn' | 'cancelled';
export type TerminationMode = 'immediate' | 'with_notice';
/** What the login becomes once the LWD has passed: read-only "My Exit" access, or nothing. */
export type OffboardingAccessMode = 'alumni' | 'blocked';

/** Notice period, in calendar days, for every employee (probation or confirmed) and every exit type.
 * Fixed by policy — not a setting. */
export const NOTICE_DAYS = 30;

/** Which date HR accepted a resignation with: the employee's requested date, the system date
 * (resignation day + NOTICE_DAYS), or a date HR picked. */
export type LwdChoice = 'requested' | 'system' | 'custom';
export const LWD_CHOICES: readonly LwdChoice[] = ['requested', 'system', 'custom'];

/** The system's last working day for a case: the day they resigned + NOTICE_DAYS. Cases created
 * before the fixed 30 days (e.g. a 15-day probation notice) are measured the same way. */
export function systemLwd(c: Pick<OffboardingCase, 'resignationDate'>): string {
  return addDaysUTC(c.resignationDate.slice(0, 10), NOTICE_DAYS);
}

/** Whole calendar days a leaver owes when they stopped before the agreed last day (0 if not). */
export function leftEarlyDays(c: Pick<OffboardingCase, 'agreedLwd' | 'approvedLwd'>): number {
  if (!c.agreedLwd || !c.approvedLwd || c.agreedLwd <= c.approvedLwd) return 0;
  return Math.round((Date.parse(c.agreedLwd.slice(0, 10) + 'T00:00:00Z') - Date.parse(c.approvedLwd.slice(0, 10) + 'T00:00:00Z')) / 86_400_000);
}

/** Statuses that are still "live" — an employee can have at most one of these at a time. */
export const OPEN_OFFBOARDING_STATUSES: readonly OffboardingStatus[] = ['pending', 'accepted', 'exited'];
/** Statuses in which the employee has left (or is leaving on a fixed date). */
export const DECIDED_OFFBOARDING_STATUSES: readonly OffboardingStatus[] = ['accepted', 'exited', 'completed'];

export const RESIGNATION_REASONS = [
  'Better opportunity', 'Higher studies', 'Relocation', 'Personal / family', 'Health', 'Compensation', 'Work environment', 'Other',
] as const;

export type ClearanceCategory = 'asset' | 'handover' | 'finance' | 'access';
export type ClearanceStatus = 'pending' | 'done' | 'na';
export const CLEARANCE_CATEGORIES: readonly ClearanceCategory[] = ['asset', 'handover', 'finance', 'access'];
export const CLEARANCE_STATUSES: readonly ClearanceStatus[] = ['pending', 'done', 'na'];
/** Only these categories can carry a recovery amount (an unreturned laptop, an unrecovered advance). */
export const DEDUCTIBLE_CATEGORIES: readonly ClearanceCategory[] = ['asset', 'finance'];
export const CLEARANCE_CATEGORY_LABEL: Record<ClearanceCategory, string> = {
  asset: 'Assets to return', handover: 'Work handover', finance: 'Finance dues', access: 'Access removal',
};

/** Limits enforced server-side (and mirrored by the forms). */
export const OFFBOARDING_LIMITS = {
  itemLength: 255,
  noteLength: 1000,
  handoverLength: 5000,
  reasonLength: 2000,
  maxDeduction: 10_000_000,
  maxItemsPerCase: 60,
} as const;

/** Statuses in which HR may still work the clearance checklist, handover and leads. */
export const WORKABLE_OFFBOARDING_STATUSES: readonly OffboardingStatus[] = ['accepted', 'exited'];

export interface OffboardingClearanceItem {
  id: number;
  offboardingId: number;
  category: ClearanceCategory;
  item: string;
  status: ClearanceStatus;
  note: string | null;
  /** Rupees recovered in F&F for this item (e.g. an unreturned laptop). */
  deductionAmount: number;
  doneBy: string | null;
  doneAt: string | null;
}

/**
 * Full & Final settlement, stored as JSON on hr_offboarding.fnf.
 *
 * Auto lines carry a stable `key` (salary, leave:<type>, expenses, left-early, clearance:<itemId>) so a
 * recalculation replaces them in place. HR may override an auto line's amount (note required), which
 * a recalculation then keeps; auto lines can't be deleted (set 0 with a note). Manual lines are free.
 * Totals are always computed server-side. `version` is bumped on every write — a save from a stale
 * screen is refused, never merged.
 */
export interface OffboardingFnfLine {
  /** Auto lines only — null for a manual line. */
  key: string | null;
  label: string;
  kind: 'earning' | 'deduction';
  /** Whole rupees, never negative — the kind decides the sign. */
  amount: number;
  source: 'auto' | 'manual';
  /** An auto line whose amount HR changed; kept across recalculation. */
  overridden?: boolean;
  /** What the system computed, kept on an overridden auto line for comparison. */
  computedAmount?: number;
  note?: string | null;
}
export type OffboardingFnfStatus = 'draft' | 'approved' | 'paid';
export interface OffboardingFnf {
  version: number;
  status: OffboardingFnfStatus;
  lines: OffboardingFnfLine[];
  earnings: number;
  deductions: number;
  /** earnings − deductions. Negative = the employee owes the company. */
  net: number;
  /** Payroll cycle (end-month key) of the LWD — the `salary` line. Earlier cycles held during the
   * notice are their own `salary:<month>` lines. Payroll skips them for it once approved. */
  salaryMonth: string;
  /** Monthly salary (CTC ÷ 12) and per-day rate (÷ 30) the lines were priced at. */
  monthlySalary: number;
  perDay: number;
  calculatedAt: string;
  calculatedBy: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  paidOn?: string | null;
  reference?: string | null;
  paidBy?: string | null;
  /** Kept for phase 4 (PDF stored with the letters). */
  pdfUrl?: string | null;
}

export const FNF_LIMITS = { maxLines: 50, labelLength: 150, maxAmount: 100_000_000, referenceLength: 100 } as const;

/** What the employee sees of their settlement: approved/paid only, no internal notes. */
export function fnfForEmployee(fnf: OffboardingFnf | null): OffboardingFnf | null {
  if (!fnf || fnf.status === 'draft') return null;
  return { ...fnf, lines: fnf.lines.map((l) => ({ key: l.key, label: l.label, kind: l.kind, amount: l.amount, source: l.source })) };
}

/** One issued letter. `text` is the merged snapshot the PDF is rebuilt from, so a later template
 * edit never changes a letter that was already issued. */
export interface OffboardingLetterRecord {
  text: string;
  issuedAt: string;
  issuedBy: string;
  /** Bumped on every re-issue. */
  revision: number;
  sentAt: string | null;
  sentTo: string | null;
  /** Last send failure (cleared by a successful send) — HR sees it and can resend. */
  sendError: string | null;
}
export interface OffboardingLetters { relieving?: OffboardingLetterRecord | null; experience?: OffboardingLetterRecord | null; }

/** What the employee sees of their letters: that they exist and when they were sent — they download the PDF. */
export function lettersForEmployee(letters: OffboardingLetters | null): OffboardingLetters | null {
  if (!letters) return null;
  const strip = (l: OffboardingLetterRecord | null | undefined) =>
    l ? { text: '', issuedAt: l.issuedAt, issuedBy: '', revision: l.revision, sentAt: l.sentAt, sentTo: l.sentTo, sendError: null } : null;
  return { relieving: strip(letters.relieving), experience: strip(letters.experience) };
}

export interface OffboardingCase {
  id: number;
  employeeId: string;
  credentialId: number | null;
  /** Employee name snapshot, for display. */
  emp: string;
  exitType: OffboardingExitType;
  initiatedBy: OffboardingInitiator;
  status: OffboardingStatus;
  resignationDate: string;
  reasonCategory: string | null;
  reasonText: string | null;
  requestedLwd: string | null;
  noticeDays: number;
  /** Record only: notice days not served because HR accepted an earlier date. No money effect. */
  noticeWaivedDays: number;
  /** The final last working day. After "left early" it is the day they actually left. */
  approvedLwd: string | null;
  /** How HR picked approvedLwd on a resignation (null for terminations / older cases). */
  lwdChoice: LwdChoice | null;
  /** Set only when HR recorded "left early" (resignations only): the last day HR had agreed. F&F then
   * forfeits every earning and recovers a flat month's salary (the `left-early` line). */
  agreedLwd: string | null;
  terminationMode: TerminationMode | null;
  accessMode: OffboardingAccessMode;
  personalEmail: string | null;
  handoverNotes: string | null;
  rehireEligible: boolean | null;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  fnf: OffboardingFnf | null;
  letters: OffboardingLetters | null;
  createdAt: string;
  updatedAt: string;
}

export interface OffboardingSettings {
  checklist: Record<ClearanceCategory, string[]>;
  encashableLeaveTypes: string[];
}

export const DEFAULT_OFFBOARDING_SETTINGS: OffboardingSettings = {
  checklist: {
    asset: ['Laptop', 'Charger', 'ID card', 'Access card'],
    handover: ['Leads reassigned', 'Handover notes received'],
    finance: ['Expense claims settled', 'Advances recovered'],
    access: ['Company email disabled', 'Tools & social access removed', 'Panel access removed'],
  },
  encashableLeaveTypes: ['Earned'],
};

/** One checklist summary: done or N/A counts as cleared. */
export interface ClearanceProgress { total: number; cleared: number; pending: number; deductions: number; }

export function clearanceProgress(items: Pick<OffboardingClearanceItem, 'status' | 'deductionAmount'>[]): ClearanceProgress {
  const cleared = items.filter((i) => i.status !== 'pending').length;
  return { total: items.length, cleared, pending: items.length - cleared, deductions: items.reduce((n, i) => n + (i.deductionAmount || 0), 0) };
}

/** Someone the leaver's sales leads can be handed to. */
export interface LeadHandoverTarget { credentialId: number; name: string; department: string; }

/** Everything HR's case window shows. */
export interface OffboardingCaseDetail {
  case: OffboardingCase;
  clearance: OffboardingClearanceItem[];
  /** Sales leads still assigned to the leaver's login. */
  leads: { total: number; lead: number; ens: number };
  /** Active employees with a department and no exit of their own in progress. */
  leadTargets: LeadHandoverTarget[];
}

/** What the employee-facing "My Exit" screen needs. `alumni` = the LWD has passed and the login
 * is now read-only. */
export interface MyExitView {
  linked: boolean;
  alumni: boolean;
  current: OffboardingCase | null;
  /** The current case's checklist (read-only for the employee). */
  clearance: OffboardingClearanceItem[];
  history: OffboardingCase[];
  /** For the resign form: the fixed notice and the system last working day if they resign today. */
  noticeDays: number;
  systemLwd: string;
  reasons: readonly string[];
}
