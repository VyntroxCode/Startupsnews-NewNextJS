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
 *  - present / short-leave / half-day / absent: decided by hours worked (realDayHoursBucket).
 *    Short leaves past the cycle's free quota cost half a day each, in date order.
 */
import { eachDateInRange, isSunday } from './time';
import { realDayHoursBucket, ShiftSettings } from './lateness';
import type { LeaveAllocation } from './leave-balance';

export type LedgerDayKind =
  | 'not-employed' | 'settled' | 'off' | 'future'
  | 'present' | 'short-leave' | 'half-day' | 'absent'
  | 'leave' | 'unpaid-leave' | 'half-leave';

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
  /** A short leave beyond the free quota — half a day deducted. */
  shortLeaveDeducted?: boolean;
  inMinutes?: number | null;
  outMinutes?: number | null;
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
  halfDayDays: number;
  shortLeaveDays: number;
  /** Short leaves past the free quota, each costing half a day. */
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
  leaveByDate: Map<string, { units: number; paid: number }>;
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
  leave: { type: string; available: number; earnedThisYear: number; appliedInCycle: number; paidInCycle: number; unpaidInCycle: number; pendingInCycle: number }[];
  /** Gross/net from these totals (TDS = the saved run's, else 0). */
  pay: { monthlyGross: number; netPay: number; tds: number };
  /** The saved payslip when this cycle has been run (auto-updated until the cycle locks). */
  saved: { monthlyGross: number; netPay: number } | null;
  locked: boolean;
  /** A leaver whose salary for this cycle is paid in their Full & Final, not by payroll. */
  paidInFnf: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Folds an allocateLeave result into per-date leave, counting only the APPROVED requests — the
 * allocation itself runs over approved + pending (pending holds balance, exactly as every leave
 * screen shows it) so a paid/unpaid split never differs between the screen and the payslip. */
export function approvedLeaveByDate(allocation: Map<string, LeaveAllocation>, approvedIds: Set<string>): Map<string, { units: number; paid: number }> {
  const out = new Map<string, { units: number; paid: number }>();
  allocation.forEach((alloc, id) => {
    if (!approvedIds.has(id)) return;
    for (const d of alloc.days) {
      const prev = out.get(d.date);
      out.set(d.date, { units: (prev?.units || 0) + d.units, paid: (prev?.paid || 0) + d.paid });
    }
  });
  return out;
}

export function buildDayLedger(input: DayLedgerInput): DayLedger {
  const { from, to, evalTo, clippedFrom, lastDay, settledThrough, holidays, rules, attendanceByDate, leaveByDate } = input;
  const freeShortLeave = Math.max(0, Number(rules.shortLeaveMonthlyQuota) || 0);
  const days: LedgerDay[] = [];
  let weekOffDays = 0, futureDays = 0, notEmployedDays = 0, halfDayDays = 0, shortLeaveDays = 0, shortLeaveDeductions = 0;
  let workedValue = 0, leaveDays = 0, unpaidLeaveDays = 0;

  for (const date of eachDateInRange(from, to)) {
    // Tested before week-off and future so Sundays outside employment aren't paid.
    if (date < clippedFrom || (lastDay && date > lastDay)) {
      notEmployedDays++;
      days.push({ date, kind: 'not-employed', pay: 0, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (settledThrough && date <= settledThrough) {
      workedValue += 1;
      days.push({ date, kind: 'settled', pay: 1, worked: 1, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (isSunday(date) || holidays.has(date)) {
      weekOffDays++;
      days.push({ date, kind: 'off', pay: 1, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (date > evalTo) {
      futureDays++;
      days.push({ date, kind: 'future', pay: 1, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    const att = attendanceByDate.get(date);
    const inMinutes = att?.inMinutes ?? null, outMinutes = att?.outMinutes ?? null;
    const bucket = realDayHoursBucket(inMinutes, outMinutes, rules);
    const leave = leaveByDate.get(date);
    const base = { date, inMinutes, outMinutes };

    if (leave && leave.units < 1) {
      // Half a day of leave: that half is paid if the balance covered it; the other half is paid
      // only if they actually worked it (at least a half day's hours).
      const worked = bucket === 'half-day' || bucket === 'short-leave' || bucket === 'full-time' ? 0.5 : 0;
      const paid = round2(leave.paid), unpaid = round2(leave.units - leave.paid);
      workedValue += worked; leaveDays += paid; unpaidLeaveDays += unpaid;
      days.push({ ...base, kind: 'half-leave', pay: round2(worked + paid), worked, paidLeave: paid, unpaidLeave: unpaid });
      continue;
    }
    if (bucket === null) {
      if (leave) {
        // Never punched in — full-day leave covers the paid part; the rest is loss of pay.
        const paid = round2(leave.paid), unpaid = round2(leave.units - leave.paid);
        leaveDays += paid; unpaidLeaveDays += unpaid;
        days.push({ ...base, kind: paid > 0 ? 'leave' : 'unpaid-leave', pay: paid, worked: 0, paidLeave: paid, unpaidLeave: unpaid });
      } else {
        days.push({ ...base, kind: 'absent', pay: 0, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      }
      continue;
    }
    if (bucket === 'absent') {
      // Came in but worked too little to count (or never punched out).
      days.push({ ...base, kind: 'absent', pay: 0, worked: 0, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (bucket === 'half-day') {
      halfDayDays++; workedValue += 0.5;
      days.push({ ...base, kind: 'half-day', pay: 0.5, worked: 0.5, paidLeave: 0, unpaidLeave: 0 });
      continue;
    }
    if (bucket === 'short-leave') {
      shortLeaveDays++;
      // The first `shortLeaveMonthlyQuota` short leaves of the cycle are free; each later one
      // costs half a day. Nothing carries into the next cycle.
      const deducted = shortLeaveDays > freeShortLeave;
      if (deducted) shortLeaveDeductions++;
      const worked = deducted ? 0.5 : 1;
      workedValue += worked;
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
      unpaidLeaveDays: round2(unpaidLeaveDays), halfDayDays, shortLeaveDays, shortLeaveDeductions,
      notEmployedDays, futureDays, paidDays: round2(paidDays), lopDays: round2(totalDays - paidDays),
    },
  };
}

/** Gross for a cycle: paid days ÷ calendar days in the cycle × monthly salary (CTC ÷ 12),
 * rounded once at the end. Net = gross − TDS, never below zero. */
export function payFromLedger(ctc: number, totals: Pick<LedgerTotals, 'paidDays' | 'totalDays'>, tds = 0): { monthlyGross: number; netPay: number } {
  const ratio = totals.totalDays > 0 ? totals.paidDays / totals.totalDays : 0;
  const monthlyGross = Math.round(ratio * (ctc / 12));
  return { monthlyGross, netPay: Math.max(0, Math.round(monthlyGross - tds)) };
}
