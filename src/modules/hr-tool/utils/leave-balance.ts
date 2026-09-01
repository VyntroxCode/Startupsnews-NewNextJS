/**
 * Leave balance accrual — computed fresh from (join date, admin-configured accrual rate, and
 * approved leave already taken this calendar year) every time it's needed, rather than a
 * stored counter that has to be kept in sync by a cron job. Framework-agnostic (no React, no
 * DB access) so it's usable from both HrToolService (server) and the HR Tool's own client
 * components (Directory.tsx / Dashboard.tsx), matching the pattern already used by
 * lateness.ts for the same reason.
 *
 * Business rule (per leave type, e.g. Casual at 1/month):
 *  - The employee is credited `perMonth` units in their joining month, no matter which day of
 *    that month they joined (never prorated).
 *  - They're credited `perMonth` more on the 1st of every subsequent calendar month.
 *  - Balance accumulates across the calendar year, minus whatever's been approved-and-used.
 *  - On 1 January the whole thing resets — unused balance from the previous year is forfeited,
 *    and accrual restarts as if January were a fresh "joining month" (so a tenured employee
 *    goes straight back to `perMonth` on 1 Jan, not 0).
 */
import { eachDateInRange } from './time';

/** How many months' worth of accrual have landed for this calendar year as of `asOf` — 0 if
 * the employee hasn't joined yet (relative to `asOf`) or `doj` is missing/unparseable. Doesn't
 * multiply by `perMonth` itself, so callers needing months rather than a leave-day count (e.g.
 * a UI showing "3 months accrued") can use this directly. */
export function monthsAccruedThisYear(doj: string, asOf: string): number {
  if (!doj) return 0;
  const [dojY, dojM] = doj.split('-').map(Number);
  const [asOfY, asOfM] = asOf.split('-').map(Number);
  if (!dojY || !dojM || !asOfY || !asOfM) return 0;
  if (dojY > asOfY) return 0; // joins in a future year — not yet employed
  if (dojY === asOfY && dojM > asOfM) return 0; // joins later this year
  // A prior-year joiner's accrual for THIS year starts at January, same as a fresh joiner —
  // the calendar-year reset means tenure before this Jan 1 doesn't matter for this year's count.
  const startMonth = dojY < asOfY ? 1 : dojM;
  return asOfM - startMonth + 1;
}

interface LeaveUsageRow { type: string; from: string; to: string; status: string; }

/** Approved days of `type` this employee has used, clipped to the calendar year of `asOf` —
 * a request spanning outside that year (e.g. Dec 28 → Jan 3) only counts the days inside it. */
export function usedDaysThisYearByType(requests: LeaveUsageRow[], type: string, asOf: string): number {
  const year = asOf.slice(0, 4);
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  let total = 0;
  for (const r of requests) {
    if (r.type !== type || r.status !== 'approved') continue;
    const clippedFrom = r.from < yearStart ? yearStart : r.from;
    const clippedTo = r.to > yearEnd ? yearEnd : r.to;
    if (clippedFrom > clippedTo) continue;
    total += eachDateInRange(clippedFrom, clippedTo).length;
  }
  return total;
}

/** Remaining balance for one leave type: months accrued this year × the type's per-month rate,
 * minus approved days already used this year. Not floored at 0 — a negative result means more
 * was approved than accrued (e.g. perMonth was lowered after leave was already granted), which
 * is worth surfacing rather than silently hiding. */
export function computeLeaveBalance(doj: string, asOf: string, perMonth: number, usedThisYear: number): number {
  const accrued = monthsAccruedThisYear(doj, asOf) * (Number(perMonth) || 0);
  return Math.round((accrued - usedThisYear) * 100) / 100;
}

/** Balances for every enabled leave type at once — the entry point most callers want. */
export function computeLeaveBalances(
  doj: string,
  leaveTypes: Record<string, { enabled: boolean; perMonth: number }>,
  requests: LeaveUsageRow[],
  asOf: string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, cfg] of Object.entries(leaveTypes)) {
    if (!cfg.enabled) continue;
    out[name] = computeLeaveBalance(doj, asOf, cfg.perMonth, usedDaysThisYearByType(requests, name, asOf));
  }
  return out;
}
