import * as XLSX from 'xlsx';
import type { HrCtcBreakdown, HrCtcSplit, HrEmployee, HrOnboarding, HrRole, HrRules } from './types';

/** Basic/HRA/Convenience/Special Allowance for one month, from a CTC Structure config (see
 * HrCtcSplit) and an employee's annual CTC. Basic is a % of monthly salary; HRA is a % of
 * BASIC (not of salary directly); Convenience is either a flat ₹/month amount or a % of
 * monthly salary; Special Allowance is always whatever's left, never its own stored
 * percentage, so the four always add up to exactly one month's salary. */
export function computeCtcBreakdown(annualCtc: number, split: HrCtcSplit): HrCtcBreakdown {
  const monthlySalary = annualCtc / 12;
  const basic = Math.round((monthlySalary * split.basicPct) / 100);
  const hra = Math.round((basic * split.hraPctOfBasic) / 100);
  const convenience = split.convenienceType === 'amount'
    ? Math.round(split.convenienceValue)
    : Math.round((monthlySalary * split.convenienceValue) / 100);
  const specialAllowance = Math.round(monthlySalary - basic - hra - convenience);
  return { basic, hra, convenience, specialAllowance };
}

/* ---------------------------------------------------------
   Dates — always the real current date. (The old standalone tool used a
   fixed simulated "TODAY" of 2026-08-05, which pinned onboarding deadlines,
   the payroll calendar, and leave-form defaults to a single hardcoded date
   forever — that's part of what made the tool look fake. Every place that
   used it now reads the real clock instead.)
--------------------------------------------------------- */
export function todayStr(): string { return new Date().toISOString().slice(0, 10); }
/** "YYYY-MM" for the current month — the canonical key HrPayrollRun.month uses, so it's
 * directly usable in date-range math. */
export function currentMonthKey(): string { return todayStr().slice(0, 7); }
/** "YYYY-MM" -> "August 2026", for display only. */
export function monthKeyToLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
export function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline + 'T23:59:59').getTime() - new Date(todayStr()).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ---------------------------------------------------------
   Role / access helpers
--------------------------------------------------------- */
export function isAdmin(role: string | null): boolean { return role === 'HR Head' || role === 'Founder'; }
export function initials(name: string): string { return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase(); }

/* ---------------------------------------------------------
   Badges
--------------------------------------------------------- */
const STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'active', probation: 'probation', exited: 'exited', onboarding: 'onboarding', pending: 'pending',
  approved: 'approved', rejected: 'rejected', open: 'open', progress: 'progress', resolved: 'resolved', not_uploaded: 'notuploaded',
};
const STATUS_BADGE_LABEL: Record<string, string> = { not_uploaded: 'Not uploaded' };
export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(' ', '');
  const cls = STATUS_BADGE_CLASS[key] || STATUS_BADGE_CLASS[status] || 'pending';
  const label = STATUS_BADGE_LABEL[status] || status;
  return <span className={`badge ${cls}`}>{label}</span>;
}

interface ApprovalLike { status: string; stage: string; }
export function ApprovalBadge({ req }: { req: ApprovalLike }) {
  if (req.status === 'rejected') return <span className="badge rejected">Rejected</span>;
  if (req.stage === 'done' && req.status === 'approved') return <span className="badge approved">Approved</span>;
  if (req.stage === 'rm') return <span className="badge rmpending">Pending — Manager</span>;
  if (req.stage === 'hr') return <span className="badge hrpending">Pending — HR</span>;
  return <span className="badge pending">Pending</span>;
}

/* ---------------------------------------------------------
   Templates / documents
--------------------------------------------------------- */
export function mergeTemplate(content: string, data: Record<string, string>): string {
  return (content || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (data[k] !== undefined ? data[k] : m));
}
export function downloadDoc(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
export function pendingEmployeeDocUpdates(employees: HrEmployee[]): HrEmployee[] {
  return employees.filter((e) => e.status !== 'exited' && e.status !== 'onboarding' && (e.documents || []).some((d) => d.status === 'pending'));
}
export function salaryPeriodLabel(rules: HrRules): string {
  return `${rules.salaryPeriodFrom} to ${rules.salaryPeriodTo === 'last' ? 'last day of the month' : rules.salaryPeriodTo}`;
}
export function shiftTimingsLabel(rules: HrRules): string {
  return `${rules.shiftStartTime}–${rules.shiftEndTime} · ${rules.shiftGraceMinutes} min grace · short leave to ${rules.shortLeaveMaxHours}h · half day to ${rules.halfDayThresholdHours}h`;
}

/* ---------------------------------------------------------
   Export helpers
--------------------------------------------------------- */
function downloadBlob(filename: string, content: BlobPart, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function toCSV(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => {
    const s = String(c === null || c === undefined ? '' : c);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
}
export function exportCSV(filename: string, rows: (string | number)[][]): void { downloadBlob(filename, toCSV(rows), 'text/csv'); }
export function exportExcel(filename: string, rows: (string | number)[][]): void {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename);
}

/* ---------------------------------------------------------
   Attendance lateness — compares a punch-in's clock-minutes against
   the configured shift start + grace period. Shared with the isolated
   Publisher/Event Admin and plain-employee attendance widgets — see
   src/modules/hr-tool/utils/lateness.ts for the actual implementation.
--------------------------------------------------------- */
export { latenessInfo, latenessBucket } from '@/modules/hr-tool/utils/lateness';

export const STAGE_LABEL: Record<string, string> = {
  awaiting_signature: "Awaiting candidate's e-signature",
  doc_upload: 'Document upload window open',
  doc_review: 'Documents under HR review',
  completed: 'Completed',
};

export function nextEmployeeId(employees: HrEmployee[]): string {
  const nums = employees.map((e) => parseInt(String(e.id || '').replace(/^E-/, ''), 10)).filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums, 100) : 100;
  return 'E-' + (max + 1);
}

export function rmOf(employees: HrEmployee[], name: string): string | null {
  const e = employees.find((x) => x.name === name);
  return e ? e.manager : null;
}

export function scopedApprovals<T extends { emp: string }>(list: T[], role: string | null, currentUserName: string | undefined, employees: HrEmployee[]): T[] {
  if (isAdmin(role)) return list;
  if (role === 'Reporting Manager') return list.filter((x) => x.emp === currentUserName || rmOf(employees, x.emp) === currentUserName);
  return list.filter((x) => x.emp === currentUserName);
}

export function applyApprovalDecision<T extends { stage: string; status: string; rmRemarks: string; hrRemarks: string }>(
  req: T, level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string, twoLevelEnabled: boolean
): T {
  if (level === 'rm') {
    if (decision === 'rejected') return { ...req, rmRemarks: remarks, status: 'rejected', stage: 'done' };
    const stage = twoLevelEnabled ? 'hr' : 'done';
    return { ...req, rmRemarks: remarks, stage, status: stage === 'done' ? 'approved' : req.status };
  }
  return { ...req, hrRemarks: remarks, status: decision, stage: 'done' };
}

export function attendanceKey(emp: string, date: string): string { return emp + '|' + date; }

/** Dynamically loads a CDN script exactly once — used for the Word-document import in the
 * Company Profile template editor (mammoth.js), which isn't an npm dependency here. */
export function loadScriptOnce(src: string, isAlreadyLoaded: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isAlreadyLoaded()) return resolve();
    const existing = document.querySelector(`script[data-dyn-src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.dataset.dynSrc = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

export type Role = HrRole;

/** Shared by the Employee dashboard's onboarding card and the Onboarding view — merges the
 * Employment Agreement template with an onboarding record's figures (CTC split honours a
 * per-employee override if one's been set). */
export function agreementMerged(o: HrOnboarding, employees: HrEmployee[], templates: Record<string, { content: string }>, rules: HrRules): string {
  const emp = o.employeeId ? employees.find((e) => e.id === o.employeeId) : null;
  const cs = emp?.ctcSplitOverride || rules.ctcSplit;
  const m = computeCtcBreakdown(o.ctc, cs);
  // Merge tags are annual figures (matching o.ctc) — the monthly breakdown ×12.
  const basic = m.basic * 12, hra = m.hra * 12, convenience = m.convenience * 12, allow = m.specialAllowance * 12;
  return mergeTemplate(templates['Employment Agreement']?.content || '', {
    employee_name: o.name, designation: o.designation, team: o.team, doj: o.signedDate || todayStr(),
    ctc: '₹' + o.ctc.toLocaleString('en-IN'), basic: '₹' + basic.toLocaleString('en-IN'),
    hra: '₹' + hra.toLocaleString('en-IN'), convenience: '₹' + convenience.toLocaleString('en-IN'),
    allowances: '₹' + allow.toLocaleString('en-IN'),
  });
}

/* ---------------------------------------------------------
   Offer letter
--------------------------------------------------------- */
/** Registered-entity details as shown on Company Profile — kept here too since the offer letter
 * needs them on its letterhead and this module doesn't import from app-level pages. */
const COMPANY = {
  name: 'DOTFYI Media Ventures Pvt. Ltd.',
  brand: 'StartupNews.fyi',
  cin: 'U74999DL2021PTC123456',
  address: '1553-A-8 Gali No. 2, West Rohtash Nagar, Shahdara, East Delhi, Delhi 110032, India',
};

export interface OfferLetterData {
  employeeName: string;
  employeeCode: string;
  /** Their portal login password — included in the letter since, for now, this is the only
   * place a new hire actually receives it (see HireEmployeeButton's dummy email send). */
  password: string;
  designation: string;
  team: string;
  manager: string | null;
  ctc: number;
  doj: string;
  documentsDeadline: string | null;
  requiredDocuments: string[];
  rules: HrRules;
}

/** Full, properly formatted offer letter — letterhead, reference, compensation breakdown (per
 * the configured CTC split), work terms, the document checklist/deadline the new hire will see
 * on their portal, and an acceptance block. Used as the default "Offer Letter" content whenever
 * HR hasn't drafted a custom template in Company Profile (a custom draft still wins — see
 * HireEmployeeButton's use of this alongside mergeTemplate). */
export function buildOfferLetterContent(d: OfferLetterData): string {
  const m = computeCtcBreakdown(d.ctc, d.rules.ctcSplit);
  // The letter shows annual figures (matching d.ctc) — the monthly breakdown ×12.
  const basic = m.basic * 12, hra = m.hra * 12, convenience = m.convenience * 12, allowances = m.specialAllowance * 12;
  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');
  const dateStr = todayStr();
  const firstName = d.employeeName.trim().split(/\s+/)[0] || d.employeeName;
  const docsList = d.requiredDocuments.length
    ? d.requiredDocuments.map((n, i) => `   ${i + 1}. ${n}`).join('\n')
    : '   (to be communicated by HR)';

  return `${COMPANY.name}
${COMPANY.address}
CIN: ${COMPANY.cin}

Date: ${dateStr}
Ref: OFFER/${d.employeeCode}/${dateStr.slice(0, 4)}

To,
${d.employeeName}

Subject: Offer of Employment — ${d.designation}

Dear ${firstName},

We are pleased to offer you employment with ${COMPANY.name} ("the Company"), for the position of ${d.designation} in the ${d.team} team, on the terms and conditions set out below. We were impressed by your background and look forward to having you on board.

1. POSITION & REPORTING
   Designation        : ${d.designation}
   Team               : ${d.team}
   Reporting Manager  : ${d.manager || 'To be assigned'}
   Employee ID        : ${d.employeeCode}

2. DATE OF JOINING
   ${d.doj}

3. EMPLOYEE PORTAL LOGIN
   Use the credentials below to sign in to the Employee Portal, track your onboarding, and upload the documents listed further below. Please change your password after your first login.
   Employee ID : ${d.employeeCode}
   Password    : ${d.password}

4. COMPENSATION
   Your Annual Cost to Company (CTC) will be ${fmt(d.ctc)}, structured as follows:
     Basic Salary          ${fmt(basic)}
     House Rent Allowance  ${fmt(hra)}
     Convenience Allowance ${fmt(convenience)}
     Special Allowance     ${fmt(allowances)}
     -----------------------------------------
     Total Annual CTC      ${fmt(d.ctc)}
   Salary is paid monthly per the Company's standard payroll cycle (${salaryPeriodLabel(d.rules)}), subject to applicable statutory deductions.

5. WORK LOCATION & HOURS
   Working days  : ${d.rules.workingDaysPattern}
   Shift timing  : ${shiftTimingsLabel(d.rules)}

6. PROBATION
   You will be on probation for 3 months from your date of joining, during which your performance and conduct will be reviewed ahead of confirmation.

7. DOCUMENTS REQUIRED
   Please submit the following via the Employee Portal ${d.documentsDeadline ? `within 5 days of joining (by ${d.documentsDeadline})` : 'within the timeline HR communicates'}:
${docsList}

8. TERMS OF EMPLOYMENT
   a. This offer is contingent on verification of the information and documents you provide.
   b. You agree to maintain strict confidentiality of the Company's proprietary and business information, both during and after your employment.
   c. Either party may terminate this employment by providing notice as per Company policy in force at the time.
   d. You agree to comply with all Company policies, rules, and code of conduct as communicated from time to time.

9. ACCEPTANCE
   Please confirm your acceptance of this offer by signing and returning a copy of this letter, or by accepting it electronically via the Employee Portal, on or before your date of joining.

We look forward to a successful association with you.

For ${COMPANY.name},


_______________________
Authorised Signatory


I, ${d.employeeName}, accept the above offer of employment on the terms and conditions stated above.

Signature: _______________________     Date: _______________
`;
}
