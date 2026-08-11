import * as XLSX from 'xlsx';
import type { HrEmployee, HrOnboarding, HrRole, HrRules } from './types';

/* ---------------------------------------------------------
   Dates — always the real current date. (The old standalone tool used a
   fixed simulated "TODAY" of 2026-08-05, which pinned onboarding deadlines,
   the payroll calendar, and leave-form defaults to a single hardcoded date
   forever — that's part of what made the tool look fake. Every place that
   used it now reads the real clock instead.)
--------------------------------------------------------- */
export function todayStr(): string { return new Date().toISOString().slice(0, 10); }
export function currentMonthLabel(): string { return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
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
  return `${rules.shiftStartTime}–${rules.shiftEndTime} · ${rules.shiftGraceMinutes} min grace · half-day below ${rules.halfDayThresholdHours} hrs`;
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
   the configured shift start + grace period.
--------------------------------------------------------- */
export function latenessInfo(inMinutes: number | null, rules: HrRules): { late: boolean; text: string } | null {
  if (inMinutes == null) return null;
  const [h, m] = rules.shiftStartTime.split(':').map(Number);
  const graceEnd = h * 60 + m + Number(rules.shiftGraceMinutes || 0);
  const diff = inMinutes - graceEnd;
  if (diff <= 0) return { late: false, text: 'On time' };
  const hrs = Math.floor(diff / 60), mins = diff % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(hrs + ' hr');
  parts.push(mins + ' min');
  return { late: true, text: parts.join(' ') + ' late' };
}

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
  const basic = Math.round((o.ctc * cs.basic) / 100);
  const hra = Math.round((o.ctc * cs.hra) / 100);
  const allow = o.ctc - basic - hra;
  return mergeTemplate(templates['Employment Agreement']?.content || '', {
    employee_name: o.name, designation: o.designation, team: o.team, doj: o.signedDate || todayStr(),
    ctc: '₹' + o.ctc.toLocaleString('en-IN'), basic: '₹' + basic.toLocaleString('en-IN'),
    hra: '₹' + hra.toLocaleString('en-IN'), allowances: '₹' + allow.toLocaleString('en-IN'),
  });
}
