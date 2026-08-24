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
   Number/date formatting for the offer letter
--------------------------------------------------------- */
const NUMBER_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const NUMBER_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitWords(n: number): string {
  if (n < 20) return NUMBER_ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return NUMBER_TENS[t] + (o ? ' ' + NUMBER_ONES[o] : '');
}
function threeDigitWords(n: number): string {
  const h = Math.floor(n / 100), rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(NUMBER_ONES[h] + ' Hundred');
  if (rest) parts.push(twoDigitWords(rest));
  return parts.join(' ');
}
/** Indian numbering (Crore/Lac/Thousand) — "Four Lacs Twenty Thousand" style, matching the
 * company's actual offer-letter template rather than international short-scale grouping. */
export function amountToIndianWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lac = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const rest = n;
  const parts: string[] = [];
  if (crore) parts.push(twoDigitWords(crore) + (crore > 1 ? ' Crores' : ' Crore'));
  if (lac) parts.push(twoDigitWords(lac) + (lac > 1 ? ' Lacs' : ' Lac'));
  if (thousand) parts.push(twoDigitWords(thousand) + ' Thousand');
  if (rest) parts.push(threeDigitWords(rest));
  return parts.join(' ');
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
/** "2026-08-22" -> "22nd August 2026" (or without the year) — matches the date style used on
 * the company's actual offer-letter template. */
export function ordinalDate(dateStr: string, withYear = true): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d}${ordinalSuffix(d)} ${MONTH_NAMES[m - 1]}${withYear ? ' ' + y : ''}`;
}

/* ---------------------------------------------------------
   Offer letter
--------------------------------------------------------- */
/** Registered-entity details as shown on Company Profile — the one shared source of truth for
 * the offer letter's letterhead/footer (JoiningLetterView.tsx and joiningLetterPdf.ts both
 * import this instead of keeping their own copies, which had drifted out of sync with each
 * other and with the company's real registration details before this was centralized). */
export const COMPANY = {
  name: 'DOTFYI Media Ventures Pvt. Ltd.',
  brand: 'StartupNews.fyi',
  cin: 'U22100DL2022PTC403240',
  address: '1553 A-8, West Rohtash Nagar, Lane No – 2, Shahdara, Delhi – 110032.',
  email: 'office@startupnews.fyi',
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

/** The company's actual offer-letter template — logo (see JoiningLetterView/joiningLetterPdf,
 * which show it as an image; here it's just implied since plain text can't embed one), a single
 * offer paragraph (role, joining date, annual compensation spelled out in words, probation), a
 * portal-login line (the one thing this template didn't need before the Employee Portal
 * existed), the document checklist, and the standard acceptance/closing. Deliberately does not
 * itemize the CTC split (Basic/HRA/Convenience) the way the internal Payroll/CTC Structure
 * tooling does — that breakdown is for payroll math, not this letter. Used as the default
 * "Offer Letter" content whenever HR hasn't drafted a custom template in Company Profile (a
 * custom draft still wins — see HireEmployeeButton's use of this alongside mergeTemplate). */
export function buildOfferLetterContent(d: OfferLetterData): string {
  const dateStr = ordinalDate(todayStr());
  const firstName = d.employeeName.trim().split(/\s+/)[0] || d.employeeName;
  const ctcWords = amountToIndianWords(d.ctc);
  const docsList = d.requiredDocuments.length
    ? d.requiredDocuments.map((n) => `• ${n}`).join('\n')
    : '• (to be communicated by HR)';

  return `Date: ${dateStr}

Offer Letter : "${d.designation}"

Dear ${firstName},

With reference to your application & subsequent Interview we had with you, we are pleased to offer you employment as "${d.designation}" in our organization. Your joining date is ${ordinalDate(d.doj, false)}, and Your Annual Compensation will be Rs. ${d.ctc.toLocaleString('en-IN')}/- (${ctcWords} Only) and you will be on a probation of 3 months.

You will be able to track your onboarding via our Employee Portal — sign in with Employee ID ${d.employeeCode} and password ${d.password} (please change it after your first login).

You are requested to share following documents for completion of processes:
${docsList}

Please confirm your acceptance to this Offer. On completion of these Documents, your joining would be completed.

Kindly check and return a copy of duly signed Appointment Letter in acceptance of the terms and conditions mentioned after receiving.


_______________________
Authorised Signatory

Warm Regards;
${COMPANY.brand}


I agree to become part of Team ${COMPANY.brand} on the terms and conditions mentioned in the letter.

Place: _______________                              Signature: _______________
Date: _______________


${COMPANY.name}
${COMPANY.cin}
${COMPANY.address}
${COMPANY.email}
`;
}
