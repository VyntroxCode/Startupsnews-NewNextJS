/**
 * Regularization policy — the fixed parts of the rule that aren't admin-configurable, shared by
 * the server (HrToolService.submitEmployeeRegularization, which enforces them) and every
 * regularization form (which only uses them to guide input). Framework-agnostic, like
 * lateness.ts, so both sides import the same numbers.
 *
 * The configurable parts live in hr_rules: the per-cycle day limit
 * (regularizationMonthlyQuota), the request window (regularizationWindowDays) and the punch
 * clock windows (PunchWindows — shared with real punches).
 */
import { addDaysUTC } from './time';
import { hhmmToMinutes } from './lateness';

/** The clock windows ("HH:MM", IST, both ends inclusive) set in hr_rules for a real Punch In /
 * Punch Out AND for the time a regularization may ask for — one set of times everywhere.
 * Punch-out windows must stay in the afternoon (from ≥ 12:00): PunchOutTimeInput shows a fixed
 * "PM". Enforced by HrToolService.punchEmployee / submitEmployeeRegularization; the forms only
 * use them to guide input. */
export interface PunchWindows { punchInFrom: string; punchInTo: string; punchOutFrom: string; punchOutTo: string; }
export const DEFAULT_PUNCH_WINDOWS: PunchWindows = { punchInFrom: '09:00', punchInTo: '15:00', punchOutFrom: '15:00', punchOutTo: '23:59' };

/** "15:00" → "3:00 PM" for messages. */
export function fmtWindowTime(hhmm: string): string {
  const minutes = hhmmToMinutes(hhmm);
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Whether a clock time (minutes since midnight) falls inside [from, to]. */
export function inWindow(minutes: number, from: string, to: string): boolean {
  return minutes >= hhmmToMinutes(from) && minutes <= hhmmToMinutes(to);
}

/** Days after a payroll cycle ends during which requests for that cycle are still accepted
 * (e.g. the 26th and 27th for a cycle ending on the 25th). After that the cycle is closed to new
 * requests, so HR can decide everything before payroll is run. */
export const REG_LATE_FILING_DAYS = 2;

export type RegularizationSource = 'employee' | 'hr-edit';

/** Out-of-window error for a requested regularization time, or null when it's allowed. Same
 * windows as a real punch (see PunchWindows). */
export function requestedTimeError(punchType: 'in' | 'out', requestedTime: string, windows: PunchWindows): string | null {
  const minutes = hhmmToMinutes(requestedTime);
  if (punchType === 'in' && !inWindow(minutes, windows.punchInFrom, windows.punchInTo)) {
    return `Punch-in time must be between ${fmtWindowTime(windows.punchInFrom)} and ${fmtWindowTime(windows.punchInTo)}. For a planned late arrival, apply for leave in advance.`;
  }
  if (punchType === 'out' && !inWindow(minutes, windows.punchOutFrom, windows.punchOutTo)) {
    return `Punch-out time must be between ${fmtWindowTime(windows.punchOutFrom)} and ${fmtWindowTime(windows.punchOutTo)}.`;
  }
  return null;
}

/** Last date on which a regularization for `date` may be filed. */
export function regularizationDeadline(date: string, windowDays: number): string {
  return addDaysUTC(date, Math.max(0, Number(windowDays) || 0));
}

interface CountableRegularization { date: string; status: string; source?: RegularizationSource | null; }

/** Distinct DAYS that use up the limit: a punch-in and a punch-out fix on the same date are one
 * day; approved, pending AND rejected requests all count (a rejected request does not give its
 * day back — since 2026-10-03); records converted from old HR edits never count. */
export function countedRegularizationDates(regs: CountableRegularization[], from: string, to: string): Set<string> {
  const dates = new Set<string>();
  for (const r of regs) {
    // A request closed because HR set the day directly (status 'cancelled') never used the limit.
    if (r.source === 'hr-edit' || r.status === 'cancelled') continue;
    if (r.date < from || r.date > to) continue;
    dates.add(r.date);
  }
  return dates;
}

interface CycleRegularization extends CountableRegularization { stage: string; }

/** What the self-service pay-cycle card needs about one cycle's regularizations, worked out exactly
 * as the HR attendance calendar does: the tile counts (in DAYS, converted HR edits left out) and
 * one dot per date for the calendar (amber pending / violet approved — HR edits included, as HR's
 * grid shows them). Shared by /api/employee/attendance/ledger and /api/admin/attendance/ledger. */
export function summarizeCycleRegularizations(allRegs: CycleRegularization[], periodFrom: string, periodTo: string, quota: number) {
  const inCycle = allRegs.filter((r) => r.date >= periodFrom && r.date <= periodTo);
  const regs = inCycle.filter((r) => r.source !== 'hr-edit');
  const regularizations = {
    pending: new Set(regs.filter((r) => r.status === 'pending').map((r) => r.date)).size,
    applied: new Set(regs.map((r) => r.date)).size,
    approved: new Set(regs.filter((r) => r.stage === 'done' && r.status === 'approved').map((r) => r.date)).size,
    limitUsed: countedRegularizationDates(regs, periodFrom, periodTo).size,
    quota,
  };
  const dots = new Map<string, 'pending' | 'approved'>();
  for (const r of inCycle) {
    if (r.status === 'pending') dots.set(r.date, 'pending');
    else if (r.stage === 'done' && r.status === 'approved' && !dots.has(r.date)) dots.set(r.date, 'approved');
  }
  const regDays = [...dots].map(([date, state]) => ({ date, state }));
  return { regularizations, regDays };
}
