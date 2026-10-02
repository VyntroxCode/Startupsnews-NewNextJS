/**
 * Leave balance — computed fresh from (join date, admin-configured accrual rate, and leave
 * requests) every time it's needed, rather than a stored counter kept in sync by a cron job.
 * Framework-agnostic (no React, no DB access) so the server (HrToolService, payroll) and every
 * leave screen use the exact same numbers.
 *
 * Accrual (per leave type, e.g. Casual at 1/month):
 *  - `perMonth` is credited in the joining month (whatever the day) and on the 1st of every
 *    later month; it accumulates across the calendar year and lapses on 1 January, when accrual
 *    restarts as if January were a fresh joining month.
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
 */
import { eachDateInRange, isSunday } from './time';

/** How many months' worth of accrual have landed for this calendar year as of `asOf` — 0 if
 * the employee hasn't joined yet (relative to `asOf`) or `doj` is missing/unparseable. */
export function monthsAccruedThisYear(doj: string, asOf: string): number {
  if (!doj) return 0;
  const [dojY, dojM] = doj.split('-').map(Number);
  const [asOfY, asOfM] = asOf.split('-').map(Number);
  if (!dojY || !dojM || !asOfY || !asOfM) return 0;
  if (dojY > asOfY) return 0; // joins in a future year — not yet employed
  if (dojY === asOfY && dojM > asOfM) return 0; // joins later this year
  // A prior-year joiner's accrual for THIS year starts at January, same as a fresh joiner.
  const startMonth = dojY < asOfY ? 1 : dojM;
  return asOfM - startMonth + 1;
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
export interface LeaveAllocation { days: LeaveDayAllocation[]; paid: number; unpaid: number; }

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Splits every balance-holding request into paid and unpaid days (see the module comment for the
 * rule). Returns one entry per request id; requests that don't hold balance get none.
 */
export function allocateLeave(
  doj: string,
  leaveTypes: Record<string, { enabled: boolean; perMonth: number }>,
  requests: LeaveRequestLike[],
  asOf: string,
  holidayDates: Iterable<string> = [],
  workedDates: Iterable<string> = []
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
  // Date order, then request id (ids carry their creation time) so the result is deterministic.
  slots.sort((a, b) => (a.date === b.date ? a.reqId.localeCompare(b.reqId) : a.date.localeCompare(b.date)));

  const usedByTypeYear = new Map<string, number>();
  for (const s of slots) {
    const cfg = leaveTypes[s.type];
    const year = s.date.slice(0, 4);
    // Balance is judged as of the leave date — or today, for a date that hasn't arrived yet
    // (in a later year than today: that year's January credit only).
    const capDate = s.date <= asOf ? s.date : (year === asOf.slice(0, 4) ? asOf : `${year}-01-01`);
    const accrued = cfg?.enabled ? monthsAccruedThisYear(doj, capDate) * (Number(cfg.perMonth) || 0) : 0;
    const key = s.type + '|' + year;
    const used = usedByTypeYear.get(key) || 0;
    const paid = Math.max(0, Math.min(s.units, accrued - used));
    usedByTypeYear.set(key, used + paid);
    const alloc = out.get(s.reqId)!;
    alloc.days.push({ date: s.date, units: s.units, paid: round2(paid) });
    alloc.paid = round2(alloc.paid + paid);
    alloc.unpaid = round2(alloc.unpaid + s.units - paid);
  }
  return out;
}

/** Balance still available today, per enabled type: accrued so far this year minus the paid days
 * already held by approved + pending requests dated this year. Never negative — anything taken
 * beyond the balance is unpaid, not a debt. */
export function computeLeaveBalances(
  doj: string,
  leaveTypes: Record<string, { enabled: boolean; perMonth: number }>,
  requests: LeaveRequestLike[],
  asOf: string,
  /** Admin holiday dates ("YYYY-MM-DD") — skipped along with Sundays when counting days used. */
  holidayDates: Iterable<string> = [],
  workedDates: Iterable<string> = []
): Record<string, number> {
  const year = asOf.slice(0, 4);
  const allocation = allocateLeave(doj, leaveTypes, requests, asOf, holidayDates, workedDates);
  const typeById = new Map(requests.map((r) => [r.id, r.type]));
  const paidByType = new Map<string, number>();
  allocation.forEach((alloc, id) => {
    const type = typeById.get(id) || '';
    const paidThisYear = alloc.days.filter((d) => d.date.slice(0, 4) === year).reduce((n, d) => n + d.paid, 0);
    paidByType.set(type, (paidByType.get(type) || 0) + paidThisYear);
  });
  const out: Record<string, number> = {};
  for (const [name, cfg] of Object.entries(leaveTypes)) {
    if (!cfg.enabled) continue;
    const accrued = monthsAccruedThisYear(doj, asOf) * (Number(cfg.perMonth) || 0);
    out[name] = round2(Math.max(0, accrued - (paidByType.get(name) || 0)));
  }
  return out;
}
