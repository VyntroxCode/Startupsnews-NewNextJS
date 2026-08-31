import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';
import type { HrKycDocuments } from './kyc';

export interface HrTeam { name: string; manager: string | null; }

export interface HrHoliday { date: string; name: string; }

export interface HrOrgStructure {
  designations: string[];
  expenseCategories: string[];
  requiredDocuments: string[];
  holidays: HrHoliday[];
}

export interface HrDocRef {
  name: string;
  status: string;
  url?: string | null;
  uploadedAt?: string | null;
  /** Admin's reason on rejection — shown back to the employee so a rejected doc isn't a dead end. */
  remarks?: string | null;
}
export interface HrSignedDoc { type: string; content: string; signedDate: string; }
export interface HrCtcSplit {
  /** Basic Salary as a % of monthly salary (ctc ÷ 12). */
  basicPct: number;
  /** HRA as a % of Basic — not of total salary directly. */
  hraPctOfBasic: number;
  /** Whether convenienceValue below is a flat monthly Rupee amount or a % of monthly salary. */
  convenienceType: 'amount' | 'percent';
  /** Convenience Allowance — Rupees/month if convenienceType is 'amount', else a % of monthly salary. */
  convenienceValue: number;
}
/** Basic/HRA/Convenience in Rupees for one month, plus Special Allowance — always the
 * remainder (monthly salary − Basic − HRA − Convenience), never stored as its own percentage.
 * See computeCtcBreakdown in components/admin/hr-tool/utils.tsx. */
export interface HrCtcBreakdown { basic: number; hra: number; convenience: number; specialAllowance: number; }

export interface HrEmployee {
  id: string;
  /** Soft reference to hr_employee_credentials.id (the Employee ID/login record created
   * alongside this one when hired through Directory's "Send Offer Letter"). Null for older
   * rows created before this link existed (e.g. CSV import) — those fall back to name-matching. */
  credentialId?: number | null;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  team: string;
  manager: string | null;
  status: string;
  doj: string;
  sysRole: string;
  ctc: number;
  leaveBalance: Record<string, number>;
  documents: HrDocRef[];
  /** Deadline for submitting the required-documents checklist — set at hire time (doj + 5 days). */
  documentsDeadline?: string | null;
  /** PAN/Aadhaar/bank/education/experience checklist — see domain/kyc.ts. Separate from
   * `documents` (the admin-configurable generic Required Documents list); this one has a fixed
   * shape defined by HR policy, with per-slot text fields and validation. */
  kycDocuments: HrKycDocuments;
  signedDocs: HrSignedDoc[];
  ctcSplitOverride?: HrCtcSplit | null;
  probationExtendedBy?: number | null;
}

export interface HrOnboardingAssets { laptop: boolean; idCard: boolean; accessCard: boolean; }

export interface HrOnboarding {
  id: string;
  name: string;
  personalEmail: string;
  designation: string;
  team: string;
  ctc: number;
  stage: string;
  offerSentDate: string | null;
  signedDate: string | null;
  uploadDeadline: string | null;
  employeeId: string | null;
  agreementStage: string;
  docs: HrDocRef[];
  assets?: HrOnboardingAssets | null;
}

export interface HrAttendanceRecord { emp: string; date: string; status: string; inTime: string; outTime: string; inMinutes?: number | null; outMinutes?: number | null; }
export interface HrAttendanceOverride { emp: string; date: string; status: string; }
export interface HrPunch { emp: string; date: string; inTime: string | null; inMinutes: number | null; outTime: string | null; outMinutes: number | null; }

export interface HrApprovalBase {
  id: string;
  emp: string;
  stage: string;
  status: string;
  rmRemarks: string;
  hrRemarks: string;
}
export type HrRegularizationPunchType = 'in' | 'out';
export interface HrRegularization extends HrApprovalBase { date: string; reason: string; punchType: HrRegularizationPunchType; requestedTime: string | null; }
export interface HrLeaveRequest extends HrApprovalBase { type: string; from: string; to: string; remarks: string; }
export interface HrExpense extends HrApprovalBase { category: string; amount: number; }

export interface HrTicket { id: string; emp: string; category: string; status: string; note: string; }

export interface HrComplianceTask { task: string; due: string; status: string; }

export interface HrPayrollRun { month: string; status: string; runAt?: string | null; runBy?: string | null; }

/** One employee's computed payroll for one month — either a live preview (not yet run) or the
 * frozen record from the last "Run Payroll" (see HrToolService.computePayrollForMonth/runPayroll). */
export interface HrPayrollEntry {
  emp: string;
  /** All calendar days in the cycle — workingDays + weekOffDays. The display column "Total Days". */
  totalDays: number;
  /** Non-working days in the cycle (Sundays + the admin's Holiday calendar) — displayed as
   * "Week Off". Not judged present/absent/leave at all, same as before this column existed. */
  weekOffDays: number;
  /** Working days in the cycle (totalDays minus weekOffDays) — kept for internal day-rate math
   * (see periodDays in computePayrollForMonth); not its own display column anymore. */
  workingDays: number;
  /** Days with an on-time or grace-period punch-in — does not include approved-leave days
   * (see leaveDays) or Short Leave / Half Day / Absent days (see absentDays). */
  presentDays: number;
  /** Approved-leave days within the period — counted separately from presentDays so "worked"
   * and "on leave" are never conflated into one number. */
  leaveDays: number;
  /** Every working day that's neither Present nor Leave nor Week Off — i.e. Short Leave, Half
   * Day, and fully-Absent days combined, a whole-day count for the "Absent Days" display column.
   * Distinct from lopDays, which is the fractional pay-impact those same days actually cost
   * (a Half Day here counts as 1 whole absent day but only 0.5 lopDays). */
  absentDays: number;
  /** Punch-ins that landed in the Short Leave window that month — the raw count for THIS
   * cycle only (not counting whatever carried in from last month). Internal bookkeeping for the
   * Short Leave → Half Day conversion; not its own display column anymore (folded into
   * absentDays for the day-count, and into lopDays for the pay-impact via shortLeaveCarryOut). */
  shortLeaveDays: number;
  /** Short Leaves left over after this month's every-3rd-one conversion (carryIn + shortLeaveDays,
   * mod 3) — carries forward as next month's starting balance, so leftover Short Leaves are never
   * lost at a cycle boundary. Persisted per employee-per-month so the next cycle's calculation
   * can read it back (see computePayrollForMonth's prevByEmp lookup). */
  shortLeaveCarryOut: number;
  /** Punch-ins that landed in the Half Day window that month — each costs half a day's pay.
   * Internal bookkeeping (see absentDays); not its own display column anymore. */
  halfDayDays: number;
  /** The actual pay-impact figure driving Net Pay — fully-absent days count 1 each, Half Day
   * (explicit or converted from Short Leave) counts 0.5 each. Can be fractional (e.g. 2.5). The
   * display column "LOP Days" — distinct from absentDays, which is a whole-day status count. */
  lopDays: number;
  monthlyGross: number;
  /** Tax deducted at source — placeholder (always 0) until a calculation rule is defined. */
  tds: number;
  netPay: number;
}

export interface HrTemplate { name: string; content: string; }

export interface HrRules {
  workingDaysPattern: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftGraceMinutes: number;
  /** Hours after shift start marking the end of the Half Day punch-in window — a punch-in
   * later than shiftStart + this many hours counts as Absent for the day. */
  halfDayThresholdHours: number;
  regularizationWindowDays: number;
  regularizationOverride: boolean;
  /** How many regularization requests an employee may submit per calendar month — separate
   * from regularizationWindowDays (which governs how many days after the attendance date a
   * request may still be filed at all). */
  regularizationMonthlyQuota: number;
  /** Hours after shift start marking the end of the Short Leave punch-in window (grace period
   * ends, Short Leave begins; this many hours after shift start, Half Day begins). */
  shortLeaveMaxHours: number;
  /** How many Short Leaves an employee may take per calendar month. */
  shortLeaveMonthlyQuota: number;
  /** Secondary rule alongside the punch-in-time buckets above: total hours worked (punch-out
   * minus punch-in) that day, below which it's an Absent day regardless of arrival time. The
   * worse of the two rules wins — see HrToolService.computePayrollForMonth. */
  halfDayMinWorkedHours: number;
  /** Hours worked at/above which the day is a Half Day rather than Absent (still below
   * shortLeaveMinWorkedHours). */
  shortLeaveMinWorkedHours: number;
  /** Hours worked at/above which the day is a full, undocked day — below this (but at/above
   * shortLeaveMinWorkedHours) it's a Short Leave. */
  fullDayMinWorkedHours: number;
  salaryPeriodFrom: number;
  salaryPeriodTo: string;
  ctcSplit: HrCtcSplit;
  leaveTypes: Record<string, HrLeaveTypeConfig>;
  twoLevelApproval: { leave: boolean; attendance: boolean; expense: boolean };
  lateMarkPenalty: boolean;
  geoFencing: boolean;
  selfieCheckin: boolean;
  pfEsi: boolean;
  optionalHolidayChoice: boolean;
  assetChecklist: boolean;
}

export interface HrAuditLogEntry { ts: string; who: string; change: string; }

/** Registered-entity identity shown on the Company Profile page — previously hardcoded directly
 * in Company.tsx with no way to edit or persist a change. */
export interface HrCompanyProfile {
  companyName: string;
  cin: string;
  registeredState: string;
}

export interface HrBootstrap {
  teams: HrTeam[];
  orgStructure: HrOrgStructure;
  employees: HrEmployee[];
  onboarding: HrOnboarding[];
  attendance: HrAttendanceRecord[];
  attendanceOverrides: HrAttendanceOverride[];
  punchLog: HrPunch[];
  regularizations: HrRegularization[];
  leaveRequests: HrLeaveRequest[];
  expenses: HrExpense[];
  tickets: HrTicket[];
  compliance: HrComplianceTask[];
  payrollRuns: HrPayrollRun[];
  templates: HrTemplate[];
  rules: HrRules;
  auditLog: HrAuditLogEntry[];
  companyProfile: HrCompanyProfile;
  /** Assigning-IDs credentials — used to show Employee ID/Role alongside attendance rows for Publisher/Event Admin punches. */
  employeeCredentials: HrEmployeeCredential[];
}

/** One configurable leave type. `perMonth` is the allowance an employee accrues each month —
 * the thing the old `Record<string, boolean>` shape had nowhere to store. */
export interface HrLeaveTypeConfig { enabled: boolean; perMonth: number; }

/** Accepts either shape and always returns the new one. Rows written before this change hold
 * `{ Casual: true, Sick: true, ... }`; reading them must not crash or silently switch a live
 * leave type off, so a legacy `true` maps to enabled with the previous default allowance. */
export function normalizeLeaveTypes(raw: unknown): Record<string, HrLeaveTypeConfig> {
  const out: Record<string, HrLeaveTypeConfig> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'boolean') { out[name] = { enabled: value, perMonth: value ? 1 : 0 }; continue; }
    if (value && typeof value === 'object') {
      const v = value as { enabled?: unknown; perMonth?: unknown };
      out[name] = { enabled: v.enabled !== false, perMonth: Math.max(0, Number(v.perMonth) || 0) };
    }
  }
  return out;
}

/** An employee asking HR to reopen their document-upload window after it closed. Approving one
 * pushes hr_employees.documents_deadline forward; see HrToolService.decideDocumentUploadRequest. */
export interface HrDocumentUploadRequest {
  id: number;
  emp: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  remarks: string | null;
  grantedUntil: string | null;
}
