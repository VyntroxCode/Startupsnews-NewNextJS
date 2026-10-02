/**
 * Regularization policy — the fixed parts of the rule that aren't admin-configurable, shared by
 * the server (HrToolService.submitEmployeeRegularization, which enforces them) and every
 * regularization form (which only uses them to guide input). Framework-agnostic, like
 * lateness.ts, so both sides import the same numbers.
 *
 * The configurable parts live in hr_rules: the per-cycle day limit
 * (regularizationMonthlyQuota) and the request window (regularizationWindowDays).
 */
import { addDaysUTC } from './time';
import { hhmmToMinutes } from './lateness';

/** Earliest/latest punch-in time a request may ask for. 14:00 is also the latest arrival that
 * can still earn a half day (4.5 h before an 18:30 shift end), so a later punch-in would be
 * Absent whether regularized or not. */
export const REG_PUNCH_IN_EARLIEST = 8 * 60;
export const REG_PUNCH_IN_LATEST = 14 * 60;
/** Earliest/latest punch-out time a request may ask for. */
export const REG_PUNCH_OUT_EARLIEST = 14 * 60;
export const REG_PUNCH_OUT_LATEST = 23 * 60;

/** Days after a payroll cycle ends during which requests for that cycle are still accepted
 * (e.g. the 26th and 27th for a cycle ending on the 25th). After that the cycle is closed to new
 * requests, so HR can decide everything before payroll is run. */
export const REG_LATE_FILING_DAYS = 2;

export type RegularizationSource = 'employee' | 'hr-edit';

/** Out-of-window error for a requested time, or null when it's allowed. */
export function requestedTimeError(punchType: 'in' | 'out', requestedTime: string): string | null {
  const minutes = hhmmToMinutes(requestedTime);
  if (punchType === 'in' && (minutes < REG_PUNCH_IN_EARLIEST || minutes > REG_PUNCH_IN_LATEST)) {
    if (minutes > REG_PUNCH_IN_LATEST) {
      return 'Punch-in after 2:00 PM can\'t earn a half day (needs 4.5 hours before shift end), so it can\'t be regularized. For a planned late arrival, apply for leave in advance.';
    }
    return 'Punch-in time must be between 8:00 AM and 2:00 PM.';
  }
  if (punchType === 'out' && (minutes < REG_PUNCH_OUT_EARLIEST || minutes > REG_PUNCH_OUT_LATEST)) {
    return 'Punch-out time must be between 2:00 PM and 11:00 PM.';
  }
  return null;
}

/** Last date on which a regularization for `date` may be filed. */
export function regularizationDeadline(date: string, windowDays: number): string {
  return addDaysUTC(date, Math.max(0, Number(windowDays) || 0));
}

interface CountableRegularization { date: string; status: string; source?: RegularizationSource | null; }

/** Distinct DAYS that use up the limit: a punch-in and a punch-out fix on the same date are one
 * day; a rejected request frees its day; records converted from old HR edits never count. */
export function countedRegularizationDates(regs: CountableRegularization[], from: string, to: string): Set<string> {
  const dates = new Set<string>();
  for (const r of regs) {
    if (r.status === 'rejected' || r.source === 'hr-edit') continue;
    if (r.date < from || r.date > to) continue;
    dates.add(r.date);
  }
  return dates;
}
