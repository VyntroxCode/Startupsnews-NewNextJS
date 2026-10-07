/**
 * Day ledger — the ONE place that decides what each day of a payroll cycle is worth for one
 * employee. Payroll (HrToolService.computePayrollForMonth) sums it into a payslip; the attendance
 * calendar renders the very same days and totals. They used to be two separate implementations
 * (server payroll loop vs. the calendar's own getDayStatus) and drifted apart — leave beyond the
 * balance showed "On leave" but was paid as LOP, a short leave past the free quota showed
 * "Present" but cost half a day, and so on. Framework-agnostic (no React, no DB access).
 *
 * Every day of the cycle lands in exactly one kind:
 *  - not-employed: before the join date or after a leaver's last working day — unpaid;
 *  - settled: already paid by an earlier run (the 1st→last to 26th→25th changeover) — paid;
 *  - off: Sunday or an admin holiday — paid;
 *  - future: a working day that hasn't happened yet (live preview only) — paid, not judged;
 *  - half-leave: half a day of leave (a half-day request, or full-day leave on a day with a
 *    punch-in — a punched day can only take half a day of leave) + the other half worked if
 *    they worked at least a half day's hours;
 *  - leave / unpaid-leave: no punch, approved leave — paid as far as the balance covered it;
 *  - a day HR set directly (overrideByDate, `hrSet: true`) takes that status instead of its hours
 *    or leave: present / short-leave / half-day / absent like a punched day, 'off' a paid week-off,
 *    'unpaid-leave' a full day of loss of pay;
 *  - present / short-leave / half-day / absent: decided by hours worked (realDayHoursBucket).
 *    Short leaves (in date order): the first `quota` are fully paid, then every 3rd one after
 *    them costs half a day — quota 2 → the 5th, 8th, 11th, 14th… are deducted (isShortLeaveDeducted).
 *  - [only while leave-balance.ts AUTO_ABSENCE_COVER is on — off since 2026-10-06, so every such
 *    day is absent / loss of pay unless an approved leave request covers it]
 *    what a punched day costs (absent 1, half day ½, deducted short leave ½) is paid from Casual
 *    automatically while the balance lasts (`autoLeave`): an absent day becomes 'leave', a half day
 *    'half-leave', a deducted short leave keeps its kind. Such days don't count in absentDays /
 *    halfDayDays / shortLeaveDeductions, which hold only what is still loss of pay.
 */
import { eachDateInRange, isSunday } from './time';
import { realDayHoursBucket, ShiftSettings } from './lateness';
import type { LeaveAllocation } from './leave-balance';
import type { HrAttendanceOverrideStatus } from '../domain/types';

export type LedgerDayKind =
  | 'not-employed' | 'settled' | 'off' | 'future'
  | 'present' | 'short-leave' | 'half-day' | 'absent'
  | 'leave' | 'unpaid-leave' | 'half-leave';

/** Plain-words label for each day kind — the HR attendance calendar's day popup and the
 * employee's own pay-cycle calendar both use it, so the two read the same. */
export const LEDGER_KIND_LABEL: Record<LedgerDayKind, string> = {
  present: 'Present', 'short-leave': 'Short leave', 'half-day': 'Half day', absent: 'Absent',
  leave: 'On leave (paid)', 'unpaid-leave': 'On leave — unpaid (no balance left)', 'half-leave': 'Half-day leave',
  off: 'Week-off / holiday', future: 'Not due yet', 'not-employed': 'Not employed on this date', settled: 'Already paid in an earlier payroll run',
};

export interface LedgerDay {
  date: string;
  kind: LedgerDayKind;
  /** What the day pays, 0–1 (worked + paid leave, or 1 for off/settled/future). */
  pay: number;
  /** Worth of the hours actually worked that day, after any short-leave deduction. */
  worked: number;
  /** Leave days on this date covered by the balance, and the part beyond it. */
  paidLeave: number;
  unpaidLeave: number;
  /** A short leave that closes a block of quota+1 — half a day deducted. */
  shortLeaveDeducted?: boolean;
  /** Paid from the Casual balance automatically (no leave request): an absence, or the unworked
   * half of a half day / deducted short leave. */
  autoLeave?: boolean;
  inMinutes?: number | null;
  outMinutes?: number | null;
  /** HR set this day's status directly (hr_attendance_overrides) — it, not the punches, decided it. */
  hrSet?: boolean;
}

export interface LedgerTotals {
  /** Calendar days in the cycle. */
  totalDays: number;
  weekOffDays: number;
  /** totalDays − weekOffDays. */
  workingDays: number;
  /** Paid worth of days worked (incl. days settled by an earlier run), after short-leave deductions. */
  presentDays: number;
  /** Paid leave days. */
  leaveDays: number;
  /** Leave taken beyond the balance (inside lopDays). */
  unpaidLeaveDays: number;
  /** Working days with no show: no punch and no leave, or too few hours / no punch-out. Whole
   * days only — unpaid leave, half days and short-leave deductions are LOP but not absences. */
  absentDays: number;
  /** Half days still costing half a day (not paid from Casual automatically). */
  halfDayDays: number;
  shortLeaveDays: number;
  /** Short leaves that closed a block of quota+1 and still cost half a day (not paid from Casual). */
  shortLeaveDeductions: number;
  notEmployedDays: number;
  futureDays: number;
  /** presentDays + weekOffDays + leaveDays + futureDays. */
  paidDays: number;
  /** totalDays − paidDays. Payroll's "LOP Days" and "Absent Days". */
  lopDays: number;
}

export interface DayLedger { days: LedgerDay[]; totals: LedgerTotals; }

export interface DayLedgerInput {
  from: string;
  to: string;
  /** Last day that can be judged (today for a cycle still running). */
  evalTo: string;
  /** Join date clipped into the cycle — days before it are not-employed. */
  clippedFrom: string;
  /** A leaver's last working day, or null. */
  lastDay: string | null;
  /** Days up to this date were already paid by an earlier run, or null. */
  settledThrough: string | null;
  holidays: Set<string>;
  rules: ShiftSettings & { shiftEndTime: string; shortLeaveMonthlyQuota: number };
  attendanceByDate: Map<string, { inMinutes?: number | null; outMinutes?: number | null }>;
  /** Approved leave per date — see approvedLeaveByDate. */
  leaveByDate: Map<string, { units: number; paid: number; auto?: boolean }>;
  /** Day statuses HR set directly — checked before leave and punches (see HrAttendanceOverride). */
  overrideByDate?: Map<string, HrAttendanceOverrideStatus>;
}

/** One employee's pay cycle, day by day — what the attendance calendar renders. Built by the same
 * code payroll pays by (buildEmployeeLedger), so its totals ARE the payslip's numbers. */
export interface EmployeeCycleLedger {
  month: string;
  periodFrom: string;
  periodTo: string;
  doj: string;
  days: LedgerDay[];
  totals: LedgerTotals;
  /** Per enabled leave type: balance left today, earned this year, and this cycle's requested
   * days — approved split into paid/unpaid (same allocation payroll pays by) plus pending. */
  leave: { type: string; available: number; earnedThisYear: number; appliedInCycle: number; paidInCycle: number; unpaidInCycle: number; pendingInCycle: number;
    /** Absences in this cycle paid from this type automatically (no request). */
    autoInCycle: number }[];
  /** Gross/net from these totals (TDS = the saved run's, else 0). */
  pay: { monthlyGross: number; netPay: number; tds: number };
  /** The saved payslip when this cycle has been run (auto-updated until the cycle locks). */
  saved: { monthlyGross: number; netPay: number } | null;
  locked: boolean;
  /** A leaver whose salary for this cycle is paid in their Full & Final, not by payroll. */
  paidInFnf: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The hours bucket an HR-set status stands in for ('off' / 'unpaid-leave' are handled apart). */
const HR_STATUS_BUCKET: Partial<Record<HrAttendanceOverrideStatus, ReturnType<typeof realDayHoursBucket>>> = {
  present: 'full-time', 'short-leave': 'short-leave', 'half-day': 'half-day', absent: 'absent',
};

/** Folds an allocateLeave result into per-date leave, counting only the APPROVED requests (and
 * the automatic absence cover) — the allocation itself runs over approved + pending (pending holds
 * balance, exactly as every leave screen shows it) so a paid/unpaid split never differs between
 * the screen and the payslip. */
export function approvedLeaveByDate(allocation: Map<string, LeaveAllocation>, approvedIds: Set<string>): Map<string, { units: number; paid: number; auto?: boolean }> {
  const out = new Map<string, { units: number; paid: number; auto?: boolean }>();
  allocation.forEach((alloc, id) => {
    if (!approvedIds.has(id) && !alloc.auto) return;
    for (const d of alloc.days) {
      const prev = out.get(d.date);
      out.set(d.date, { units: (prev?.units || 0) + d.units, paid: (prev?.paid || 0) + d.paid, ...(alloc.auto ? { auto: true } : {}) });
    }
  });
  return out;
}

/** After the free short leaves, every this-many-th one costs half a day. */
export const SHORT_LEAVE_DEDUCT_EVERY = 3;

/** Whether the `n`th short leave of a cycle (1-based, date order) costs half a day: the first
 * `freeCount` are fully paid, then every SHORT_LEAVE_DEDUCT_EVERY-th after them — free 2 → 5, 8, 11… */
export function isShortLeaveDeducted(n: number, freeCount: number): boolean {
  return n > freeCount && (n - freeCount) % SHORT_LEAVE_DEDUCT_EVERY === 0;
}

/** Positions of the first few deducted short leaves, for display: free 2 → "5th, 8th, 11th". */
export function shortLeaveDeductedPositions(freeCount: number, count = 3): number[] {
  return Array.from({ length: count }, (_, i) => freeCount + SHORT_LEAVE_DEDUCT_EVERY * (i + 1));
}

/** Short-leave rule in plain words — "First 2 fully paid, then every 3rd costs ½ day (5th, 8th, 11th…)". */
export function shortLeaveRuleText(freeCount: number): string {
  const ord = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] || 'th'}`;
  const first = freeCount > 0 ? `First ${freeCount} fully paid, then every` : 'Every';
  return `${first} ${ord(SHORT_LEAVE_DEDUCT_EVERY)} costs ½ day (${shortLeaveDeductedPositions(freeCount).map(ord).join(', ')}…)`;
}

/** Short-leave rule for a small tile — "First 2 free". */
export function shortLeaveRuleShort(freeCount: number): string {
  return freeCount > 0 ? `First ${freeCount} free` : 'No free short leaves';
}

export function buildDayLedger(input: DayLedgerInput): DayLedger {
  const { from, to, evalTo, clippedFrom, lastDay, settledThrough, holidays, rules, attendanceByDate, leaveByDate, overrideByDate } = input;
  const freeShortLeave = Math.max(0, Number(rules.shortLeaveMonthlyQuota) || 0);
  const days: LedgerDay[] = [];
  let weekOffDays = 0, futureDays = 0, notEmployedDays = 0, halfDayDays = 0, shortLeaveDays = 0, shortLeaveDeductions = 0, absentDays = 0;
  let workedValue = 0, leaveDays = 0, unpaidLeaveDays = 0;

  for (const date of eachDateInRange(from, to)) {
    // Tested before week-off and future so Sundays outside employment aren't paid.
    if (date < clippedFrom || (lastDay && date > lastDay)) {
      notEmployedDays++;
      days.push({ date, kind: 'not-employed', pay: 0, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    // Tested before settled so a Sunday/holiday inside the already-paid stretch still counts as a
    // week-off, not a present day (pay is the same either way).
    if (isSunday(date) || holidays.has(date)) {
      weekOffDays++;
      days.push({ date, kind: 'off', pay: 1, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (settledThrough && date <= settledThrough) {
      workedValue += 1;
      days.push({ date, kind: 'settled', pay: 1, worked: 1, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (date > evalTo) {
      futureDays++;
      days.push({ date, kind: 'future', pay: 1, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    const att = attendanceByDate.get(date);
    const inMinutes = att?.inMinutes ?? null, outMinutes = att?.outMinutes ?? null;
    // A day HR set directly: its status replaces the hours bucket, and leave is ignored (the
    // service refuses an override on a date with leave). Short leave still counts toward the
    // free quota like a punched one.
    const hrStatus = overrideByDate?.get(date);
    const bucket = hrStatus ? HR_STATUS_BUCKET[hrStatus] ?? null : realDayHoursBucket(inMinutes, outMinutes, rules);
    const leave = hrStatus ? undefined : leaveByDate.get(date);
    // Casual paid automatically for a punched day that still costs pay (absent / half day /
    // deducted short leave) — see punchedShortfall. No-punch absences go through `leave` below.
    const cover = leave?.auto && bucket !== null ? leave : undefined;
    const base = hrStatus ? { date, inMinutes, outMinutes, hrSet: true } : { date, inMinutes, outMinutes };

    if (hrStatus === 'off') {
      weekOffDays++;
      days.push({ ...base, kind: 'off', pay: 1, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (hrStatus === 'unpaid-leave') {
      unpaidLeaveDays += 1;
      days.push({ ...base, kind: 'unpaid-leave', pay: 0, worked: 0, paidLeave: 0, unpaidLeave: 1 });
      continue;
    }

    if (leave && !leave.auto && leave.units < 1) {
      // Half a day of leave: that half is paid if the balance covered it; the other half is paid
      // only if they actually worked it (at least a half day's hours).
      const worked = bucket === 'half-day' || bucket === 'short-leave' || bucket === 'full-time' ? 0.5 : 0;
      const paid = round2(leave.paid), unpaid = round2(leave.units - leave.paid);
      workedValue += worked; leaveDays += paid; unpaidLeaveDays += unpaid;
      days.push({ ...base, kind: 'half-leave', pay: round2(worked + paid), worked, paidLeave: paid, unpaidLeave: unpaid });
      continue;
    }
    if (bucket === null || (bucket === 'absent' && cover)) {
      if (leave) {
        // Never punched in (or punched in but absent, paid from Casual automatically) — full-day
        // leave covers the paid part; the rest is loss of pay.
        const paid = round2(leave.paid), unpaid = round2(leave.units - leave.paid);
        leaveDays += paid; unpaidLeaveDays += unpaid;
        days.push({ ...base, kind: paid > 0 ? 'leave' : 'unpaid-leave', pay: paid, worked: 0, paidLeave: paid, unpaidLeave: unpaid, ...(leave.auto ? { autoLeave: true } : {}) });
      } else {
        absentDays++;
        days.push({ ...base, kind: 'absent', pay: 0, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      }
      continue;
    }
    if (bucket === 'absent') {
      // Came in but worked too little to count (or never punched out).
      absentDays++;
      days.push({ ...base, kind: 'absent', pay: 0, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (bucket === 'half-day' && cover) {
      // Worked half; the other half paid from Casual automatically.
      const paid = round2(cover.paid), unpaid = round2(cover.units - cover.paid);
      workedValue += 0.5; leaveDays += paid; unpaidLeaveDays += unpaid;
      days.push({ ...base, kind: 'half-leave', pay: round2(0.5 + paid), worked: 0.5, paidLeave: paid, unpaidLeave: unpaid, autoLeave: true });
      continue;
    }
    if (bucket === 'half-day') {
      halfDayDays++; workedValue += 0.5;
      days.push({ ...base, kind: 'half-day', pay: 0.5, worked: 0.5, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (bucket === 'short-leave') {
      shortLeaveDays++;
      // The first `shortLeaveMonthlyQuota` are fully paid, then every 3rd one after them costs
      // half a day (quota 2 → 5th, 8th, 11th… deducted). Nothing carries into the next cycle.
      const deducted = isShortLeaveDeducted(shortLeaveDays, freeShortLeave);
      const worked = deducted ? 0.5 : 1;
      workedValue += worked;
      if (deducted && cover) {
        // The deducted half is paid from Casual automatically — not loss of pay.
        const paid = round2(cover.paid), unpaid = round2(cover.units - cover.paid);
        leaveDays += paid; unpaidLeaveDays += unpaid;
        days.push({ ...base, kind: 'short-leave', pay: round2(worked + paid), worked, paidLeave: paid, unpaidLeave: unpaid, shortLeaveDeducted: true, autoLeave: true });
        continue;
      }
      if (deducted) shortLeaveDeductions++;
      days.push({ ...base, kind: 'short-leave', pay: worked, worked, paidLeave: 0, unpaidLeave: 0, shortLeaveDeducted: deducted });
      continue;
    }
    workedValue += 1;
    days.push({ ...base, kind: 'present', pay: 1, worked: 1, paidLeave: 0, unpaidLeave: 0 });
  }

  const totalDays = days.length;
  const presentDays = round2(workedValue);
  const paidLeave = round2(leaveDays);
  const paidDays = presentDays + weekOffDays + paidLeave + futureDays;
  return {
    days,
    totals: {
      totalDays, weekOffDays, workingDays: totalDays - weekOffDays, presentDays, leaveDays: paidLeave,
      unpaidLeaveDays: round2(unpaidLeaveDays), absentDays, halfDayDays, shortLeaveDays, shortLeaveDeductions,
      notEmployedDays, futureDays, paidDays: round2(paidDays), lopDays: round2(totalDays - paidDays),
    },
  };
}

/** What a cycle's loss of pay is made of, in plain words — e.g. "3 absent · ½ half day · ½ short
 * leave". Only non-zero parts; empty when there's no LOP. Shown under the LOP tile so it reads next
 * to the separate Absent tile, the same split as payroll's Absent / LOP columns. */
export function lopBreakdown(t: Pick<LedgerTotals, 'absentDays' | 'halfDayDays' | 'shortLeaveDeductions' | 'unpaidLeaveDays' | 'notEmployedDays'>): string {
  const n = (v: number) => (v === 0.5 ? '½' : Number.isInteger(v) ? String(v) : v.toFixed(1));
  return [
    t.absentDays > 0 && `${n(t.absentDays)} absent`,
    t.halfDayDays > 0 && `${n(t.halfDayDays * 0.5)} half day`,
    t.shortLeaveDeductions > 0 && `${n(t.shortLeaveDeductions * 0.5)} short leave`,
    t.unpaidLeaveDays > 0 && `${n(t.unpaidLeaveDays)} unpaid leave`,
    t.notEmployedDays > 0 && `${n(t.notEmployedDays)} before joining / after leaving`,
  ].filter(Boolean).join(' · ');
}

/** Gross for a cycle: paid days ÷ calendar days in the cycle × monthly salary (CTC ÷ 12),
 * rounded once at the end. Net = gross − TDS, never below zero. */
export function payFromLedger(ctc: number, totals: Pick<LedgerTotals, 'paidDays' | 'totalDays'>, tds = 0): { monthlyGross: number; netPay: number } {
  const ratio = totals.totalDays > 0 ? totals.paidDays / totals.totalDays : 0;
  const monthlyGross = Math.round(ratio * (ctc / 12));
  return { monthlyGross, netPay: Math.max(0, Math.round(monthlyGross - tds)) };
}
