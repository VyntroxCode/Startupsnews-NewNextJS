/**
 * Leave balance — computed fresh from (join date, admin-configured accrual rate, and leave
 * requests) every time it's needed, rather than a stored counter kept in sync by a cron job.
 * Framework-agnostic (no React, no DB access) so the server (HrToolService, payroll) and every
 * leave screen use the exact same numbers.
 *
 * Accrual (per leave type, e.g. Casual at 1/month) — since 2026-10-06, by pay cycle:
 *  - `perMonth` is credited each time a pay cycle ends, on the cycle's start day (`creditDay`,
 *    the 26th for a 26th → 25th cycle). The first credit is the first credit day AFTER the join
 *    date — i.e. when the joining cycle ends (joins 10 Oct → 26 Oct; joins 26 Oct → 26 Nov).
 *  - The leave year runs credit day of December → the day before it a year later (26 Dec → 25 Dec,
 *    see leaveYearOf). Unused balance lapses when it ends; the 26 Dec credit is the new year's first,
 *    so a full year has 12 credits (26 Dec, 26 Jan … 26 Nov). With a 1st → last cycle that is
 *    simply the calendar year (credits 1 Jan … 1 Dec).
 *
 * Spending (allocateLeave — the single source of truth for "is this leave day paid?"):
 *  - A request covers every date from→to except Sundays and admin holidays (no sandwich rule);
 *    Saturdays are working days and count. A half-day request is 0.5 of its single date.
 *  - Approved AND pending requests use balance (pending holds it); rejected/cancelled don't.
 *  - Days are paid in date order while balance lasts. The balance available on a date is what
 *    has accrued by then — or, for a date still in the future, by `asOf` (today), so a preview
 *    never promises credit that hasn't been earned yet. Anything beyond the balance is still
 *    granted time off, but unpaid (loss of pay). Only paid days consume balance.
 *  - A type that isn't enabled (or a legacy free-text type) has no balance: all unpaid.
 *  - A full-day leave date the employee punched in on (`workedDates`) can only be HALF a day of
 *    leave — they came in, so the day is half worked (if they did the hours) and half leave. It
 *    uses 0.5 of the balance. New data can't produce this (punch-in, applying and approving all
 *    refuse full-day leave on a punched date), but older records can.
 *
 * Absences covered automatically — OFF since 2026-10-06 (AUTO_ABSENCE_COVER = false): a day
 * without an approved leave request is absent / loss of pay whatever the balance; Casual is used
 * only by a leave request. While the switch is off the `absenceCover` option is ignored. When on:
 *  - A working day (not Sunday / holiday) from ABSENCE_COVER_FROM (or the join date) up to
 *    `absenceCover.through` with no punch-in at all, no approved/pending leave request and no
 *    HR-set status (`absenceCover.skip`) is an
 *    absence. Each one is paid from the Casual balance, in the same date order as requested leave
 *    (one synthetic allocation, id ABSENCE_COVER_ID, `auto: true`). An absence the balance can't
 *    cover stays an absence (loss of pay) — it is never listed as unpaid leave.
 *  - Days WITH a punch-in that still cost pay are covered too (since 2026-10-04, pass
 *    `absenceCover.shortfall` — see punchedShortfall): an absent day (too few hours / no
 *    punch-out) uses 1, a half day 0.5, and a short leave that completes a set of quota+1 0.5.
 *    Same Casual balance, same date order, same "not covered → loss of pay".
 *  - Nothing is stored: a later punch, an approved regularization or a leave request on that date
 *    takes the day out of the cover and the balance comes back.
 */
import { isShortLeaveDeducted } from './day-ledger';
import { addDaysUTC, eachDateInRange, isSunday, payrollMonthKeyForDate, payrollPeriodRange } from './time';
import { realDayHoursBucket, type HoursWorkedBucket, type ShiftSettings } from './lateness';
import type { HrAttendanceOverrideStatus } from '../domain/types';

/** Absences before this date are never covered — earlier cycles were already paid (frozen) with
 * those days as loss of pay. 2026-09-26 = first day of the first cycle not frozen at launch. */
export const ABSENCE_COVER_FROM = '2026-09-26';
/** The leave type that covers absences. */
export const ABSENCE_COVER_TYPE = 'Casual';
/** The automatic Casual cover below (absences / half days / deducted short leaves paid from Casual
 * without a leave request). Off: Casual is used only by approved leave requests. Setting this to
 * true is the one code change that brings the cover back — every caller still passes its options. */
export const AUTO_ABSENCE_COVER = false;

/** The day of the month leave is credited — the day after a pay cycle ends, i.e. the cycle's start
 * day (`salaryPeriodFrom`, 26). Clamped to 1–28 like the cycle itself. */
export function leaveCreditDay(rules: { salaryPeriodFrom?: number | null }): number {
  const d = Math.floor(Number(rules.salaryPeriodFrom) || 1);
  return Math.min(28, Math.max(1, d));
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** The leave year a date belongs to: a credit day of 26 → 26 Dec 2026 – 25 Dec 2027 is 2027.
 * creditDay 1 → the calendar year. */
export function leaveYearOf(date: string, creditDay: number): number {
  const y = Number(date.slice(0, 4));
  return creditDay > 1 && date >= `${y}-12-${pad2(creditDay)}` ? y + 1 : y;
}

/** First day of leave year `year` (26 Dec of the year before, or 1 Jan for creditDay 1). */
export function leaveYearStart(year: number, creditDay: number): string {
  return creditDay > 1 ? `${year - 1}-12-${pad2(creditDay)}` : `${year}-01-01`;
}

/** One-time restart of leave balances (2026-10-06): every credit before this date is void, so
 * everyone stood at 0 Casual on that day and the first credit is 26 Oct 2026 (end of the October
 * cycle). Leave requests created before LEAVE_RESET_AT_MS are "legacy" (isLegacyLeaveRequest): they
 * keep the paid/unpaid split they had — allocated against the credits without this cut — and don't
 * use the new balance. */
export const LEAVE_CREDIT_FROM = '2026-10-26';
/** 2026-10-06 08:09 IST — requests created before this keep their old split (see LEAVE_CREDIT_FROM). */
export const LEAVE_RESET_AT_MS = 1791254356869;

/** Whether a leave request was created before the 2026-10-06 balance restart. Ids are
 * 'L-' + Date.now(); anything that doesn't parse as one predates that scheme, so it's legacy too.
 * The automatic cover is never legacy. */
export function isLegacyLeaveRequest(id: string): boolean {
  if (id === ABSENCE_COVER_ID) return false;
  const m = /^L-(\d+)$/.exec(id);
  return !m || Number(m[1]) < LEAVE_RESET_AT_MS;
}

/** How many credits have landed in `asOf`'s leave year by `asOf` (inclusive): the credit dates
 * are the leave year's start and the same day of each of the next 11 months; only those strictly
 * after the join date count (the joining cycle must end first), and — unless `creditFrom` is ''
 * (legacy requests) — none before LEAVE_CREDIT_FROM. 0 without a join date. */
export function creditsAccruedThisYear(doj: string, asOf: string, creditDay: number, creditFrom: string = LEAVE_CREDIT_FROM): number {
  if (!doj || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return 0;
  const start = leaveYearStart(leaveYearOf(asOf, creditDay), creditDay);
  let [y, m] = start.split('-').map(Number);
  let n = 0;
  for (let k = 0; k < 12; k++) {
    const d = `${y}-${pad2(m)}-${pad2(creditDay)}`;
    if (d > asOf) break;
    if (d > doj && d >= creditFrom) n++;
    if (++m > 12) { m = 1; y++; }
  }
  return n;
}

/** Allocation id of the automatic absence cover. */
export const ABSENCE_COVER_ID = 'auto-absence-cover';

export interface AbsenceCoverOptions {
  /** Last date that can count as an absence — yesterday (today isn't over), or a leaver's last
   * working day if that's earlier. See absenceCoverThrough. */
  through: string;
  /** Dates HR set a status on directly (hr_attendance_overrides) — the HR status decides those
   * days, so they're never paid from Casual automatically. */
  skip?: Iterable<string>;
  /** Punched dates that still cost pay → the days they cost (1 / 0.5) — see punchedShortfall.
   * Without it, only days with no punch-in at all are covered. */
  shortfall?: Record<string, number>;
}

/** `through` for AbsenceCoverOptions: the day before `asOf`, capped at a leaver's last day. */
export function absenceCoverThrough(asOf: string, lastDay?: string | null): string {
  const yesterday = addDaysUTC(asOf, -1);
  return lastDay && lastDay < yesterday ? lastDay : yesterday;
}

/** The hours bucket an HR-set status stands in for — the same mapping as the day ledger. */
const HR_STATUS_BUCKET: Partial<Record<HrAttendanceOverrideStatus, HoursWorkedBucket>> = {
  present: 'full-time', 'short-leave': 'short-leave', 'half-day': 'half-day', absent: 'absent',
};

/**
 * `shortfall` for AbsenceCoverOptions: every working date from the cover's start to `through`
 * where the employee punched in but the day still costs pay, judged exactly as the day ledger
 * pays it — absent (too few hours / no punch-out) 1, half day 0.5, and a short leave that
 * completes a set of quota+1 in its pay cycle 0.5. Dates with approved leave are leave days, not
 * counted. HR-set days count toward the short-leave sets (as the ledger does) but are never
 * covered themselves. Pass the same requests list given to allocateLeave.
 */
export function punchedShortfall(input: {
  doj: string;
  attendance: { date: string; inMinutes?: number | null; outMinutes?: number | null }[];
  overrides?: { date: string; status: HrAttendanceOverrideStatus }[];
  requests: LeaveRequestLike[];
  holidayDates?: Iterable<string>;
  rules: ShiftSettings & { shiftEndTime: string; shortLeaveMonthlyQuota: number; salaryPeriodFrom: number; salaryPeriodTo: number | string };
  through: string;
}): Record<string, number> {
  const { doj, rules, through } = input;
  const out: Record<string, number> = {};
  if (!doj) return out;
  const start = doj > ABSENCE_COVER_FROM ? doj : ABSENCE_COVER_FROM;
  if (start > through) return out;
  const holidaySet = new Set(input.holidayDates || []);
  const punches = new Map(input.attendance.map((a) => [a.date, a]));
  const hrSet = new Map((input.overrides || []).map((o) => [o.date, o.status]));
  const approved = new Set<string>();
  for (const r of input.requests) {
    if (r.status === 'approved') for (const d of leaveDayUnits(r, holidaySet)) approved.add(d.date);
  }
  const freeShortLeave = Math.max(0, Number(rules.shortLeaveMonthlyQuota) || 0);
  // Short-leave sets restart every pay cycle, so count from the start of the cover's first cycle.
  const { from: cycleFrom } = payrollPeriodRange(payrollMonthKeyForDate(start, rules), rules);
  let cycleKey = '', shortLeaves = 0;
  for (const date of eachDateInRange(cycleFrom > doj ? cycleFrom : doj, through)) {
    const key = payrollMonthKeyForDate(date, rules);
    if (key !== cycleKey) { cycleKey = key; shortLeaves = 0; }
    if (isSunday(date) || holidaySet.has(date)) continue;
    const hrStatus = hrSet.get(date);
    if (!hrStatus && approved.has(date)) continue;
    const att = punches.get(date);
    const bucket = hrStatus ? HR_STATUS_BUCKET[hrStatus] ?? null : realDayHoursBucket(att?.inMinutes ?? null, att?.outMinutes ?? null, rules);
    let units = 0;
    if (bucket === 'absent') units = 1;
    else if (bucket === 'half-day') units = 0.5;
    else if (bucket === 'short-leave') {
      shortLeaves++;
      if (isShortLeaveDeducted(shortLeaves, freeShortLeave)) units = 0.5;
    }
    if (units > 0 && !hrStatus && date >= start) out[date] = units;
  }
  return out;
}

export type LeaveHalf = 'first' | 'second';

export interface LeaveRequestLike {
  id: string;
  type: string;
  from: string;
  to: string;
  status: string;
  halfDay?: LeaveHalf | null;
}

/** Statuses that use balance. */
export function leaveHoldsBalance(status: string): boolean {
  return status === 'approved' || status === 'pending';
}

/** The working dates a request covers, with how much of each day it takes (1, or 0.5). */
export function leaveDayUnits(req: Pick<LeaveRequestLike, 'from' | 'to' | 'halfDay'>, holidayDates: Iterable<string> = []): { date: string; units: number }[] {
  if (!req.from || !req.to || req.to < req.from) return [];
  const holidaySet = holidayDates instanceof Set ? holidayDates as Set<string> : new Set(holidayDates);
  const dates = eachDateInRange(req.from, req.to).filter((d) => !isSunday(d) && !holidaySet.has(d));
  const units = req.halfDay && req.from === req.to ? 0.5 : 1;
  return dates.map((date) => ({ date, units }));
}

export interface LeaveDayAllocation { date: string; units: number; paid: number; }
export interface LeaveAllocation {
  days: LeaveDayAllocation[]; paid: number; unpaid: number;
  /** Set on the automatic absence cover only (it has no request to read the type from). */
  type?: string; auto?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Splits every balance-holding request into paid and unpaid days (see the module comment for the
 * rule). Returns one entry per request id; requests that don't hold balance get none.
 */
export function allocateLeave(
  doj: string,
  leaveTypes: Record<string, { enabled: boolean; perMonth: number }>,
  /** leaveCreditDay(rules) — when credits land and where the leave year starts. */
  creditDay: number,
  requests: LeaveRequestLike[],
  asOf: string,
  holidayDates: Iterable<string> = [],
  workedDates: Iterable<string> = [],
  absenceCover?: AbsenceCoverOptions
): Map<string, LeaveAllocation> {
  const holidaySet = new Set(holidayDates);
  const workedSet = new Set(workedDates);
  const out = new Map<string, LeaveAllocation>();
  const slots: { reqId: string; type: string; date: string; units: number }[] = [];
  for (const r of requests) {
    if (!leaveHoldsBalance(r.status)) continue;
    out.set(r.id, { days: [], paid: 0, unpaid: 0 });
    for (const d of leaveDayUnits(r, holidaySet)) {
      const units = d.units === 1 && workedSet.has(d.date) ? 0.5 : d.units;
      slots.push({ reqId: r.id, type: r.type, date: d.date, units });
    }
  }
  if (AUTO_ABSENCE_COVER && absenceCover && doj && leaveTypes[ABSENCE_COVER_TYPE]?.enabled) {
    // Every date a request already covers (slots holds them all) is leave, not an absence.
    const requested = new Set(slots.map((s) => s.date));
    for (const d of absenceCover.skip || []) requested.add(d);
    const start = doj > ABSENCE_COVER_FROM ? doj : ABSENCE_COVER_FROM;
    out.set(ABSENCE_COVER_ID, { days: [], paid: 0, unpaid: 0, type: ABSENCE_COVER_TYPE, auto: true });
    for (const date of start <= absenceCover.through ? eachDateInRange(start, absenceCover.through) : []) {
      if (isSunday(date) || holidaySet.has(date) || requested.has(date)) continue;
      // No punch-in: a whole day. Punched in: only what the day still costs (absent / half day /
      // deducted short leave), when the caller passed it.
      const units = workedSet.has(date) ? absenceCover.shortfall?.[date] || 0 : 1;
      if (units > 0) slots.push({ reqId: ABSENCE_COVER_ID, type: ABSENCE_COVER_TYPE, date, units });
    }
  }
  // Date order, then request id (ids carry their creation time) so the result is deterministic.
  slots.sort((a, b) => (a.date === b.date ? a.reqId.localeCompare(b.reqId) : a.date.localeCompare(b.date)));

  const usedByTypeYear = new Map<string, number>();
  for (const s of slots) {
    const cfg = leaveTypes[s.type];
    const year = leaveYearOf(s.date, creditDay);
    // Balance is judged as of the leave date — or today, for a date that hasn't arrived yet
    // (in a later leave year than today: that year's first credit only, landing on its start).
    const capDate = s.date <= asOf ? s.date : (year === leaveYearOf(asOf, creditDay) ? asOf : leaveYearStart(year, creditDay));
    // Legacy requests (before the 2026-10-06 restart) are split against the credits without the
    // restart and in their own pool, so they keep their split and never use the new balance.
    const legacy = isLegacyLeaveRequest(s.reqId);
    const accrued = cfg?.enabled ? creditsAccruedThisYear(doj, capDate, creditDay, legacy ? '' : LEAVE_CREDIT_FROM) * (Number(cfg.perMonth) || 0) : 0;
    const key = (legacy ? 'legacy|' : '') + s.type + '|' + year;
    const used = usedByTypeYear.get(key) || 0;
    const paid = Math.max(0, Math.min(s.units, accrued - used));
    usedByTypeYear.set(key, used + paid);
    const alloc = out.get(s.reqId)!;
    alloc.days.push({ date: s.date, units: s.units, paid: round2(paid) });
    alloc.paid = round2(alloc.paid + paid);
    alloc.unpaid = round2(alloc.unpaid + s.units - paid);
  }
  // Absences the balance didn't reach stay plain absences — keep only the days it paid for.
  const cover = out.get(ABSENCE_COVER_ID);
  if (cover) {
    cover.days = cover.days.filter((d) => d.paid > 0);
    cover.unpaid = round2(cover.days.reduce((n, d) => n + d.units - d.paid, 0));
  }
  return out;
}

/** Balance still available today, per enabled type: accrued so far this year minus the paid days
 * already held by approved + pending requests dated this year. Never negative — anything taken
 * beyond the balance is unpaid, not a debt. */
export function computeLeaveBalances(
  doj: string,
  leaveTypes: Record<string, { enabled: boolean; perMonth: number }>,
  /** leaveCreditDay(rules). */
  creditDay: number,
  requests: LeaveRequestLike[],
  asOf: string,
  /** Admin holiday dates ("YYYY-MM-DD") — skipped along with Sundays when counting days used. */
  holidayDates: Iterable<string> = [],
  workedDates: Iterable<string> = [],
  absenceCover?: AbsenceCoverOptions
): Record<string, number> {
  const year = leaveYearOf(asOf, creditDay);
  const allocation = allocateLeave(doj, leaveTypes, creditDay, requests, asOf, holidayDates, workedDates, absenceCover);
  const typeById = new Map(requests.map((r) => [r.id, r.type]));
  const paidByType = new Map<string, number>();
  allocation.forEach((alloc, id) => {
    if (isLegacyLeaveRequest(id)) return; // paid from the pre-restart pool, not this balance
    const type = alloc.type || typeById.get(id) || '';
    const paidThisYear = alloc.days.filter((d) => leaveYearOf(d.date, creditDay) === year).reduce((n, d) => n + d.paid, 0);
    paidByType.set(type, (paidByType.get(type) || 0) + paidThisYear);
  });
  const out: Record<string, number> = {};
  for (const [name, cfg] of Object.entries(leaveTypes)) {
    if (!cfg.enabled) continue;
    const accrued = creditsAccruedThisYear(doj, asOf, creditDay) * (Number(cfg.perMonth) || 0);
    out[name] = round2(Math.max(0, accrued - (paidByType.get(name) || 0)));
  }
  return out;
}
