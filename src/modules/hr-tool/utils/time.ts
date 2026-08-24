/**
 * Server-side date/time helpers for attendance/punch recording, shared by every punch
 * path (Publisher/Event Admin via /api/admin/attendance, plain employees via
 * /api/employee/attendance). Matches the date convention the existing HR Tool Employee
 * self-service flow already uses client-side (src/components/admin/hr-tool/utils.tsx's
 * todayStr()) so records land on the same "today" the Founder's Attendance view filters by.
 */
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Whole days remaining until (positive) or past (negative/zero) a YYYY-MM-DD deadline,
 * counting today as day 0. Matches the client-side daysLeft() in components/admin/hr-tool/utils.tsx. */
export function daysUntil(dateStr: string): number {
  const ms = new Date(dateStr + 'T23:59:59').getTime() - new Date(todayStr()).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function nowTimeStr(): string {
  return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}

export function nowMinutesSinceMidnight(): number {
  const parts = new Date()
    .toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false })
    .split(':');
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/**
 * Resolves a "YYYY-MM" query param (from the employee attendance calendar's month picker)
 * into a validated month string plus its first/last calendar date — falling back to the
 * current month for anything missing or malformed, so a bad param can't leak into a SQL
 * BETWEEN range.
 */
export function monthRange(monthParam: string | null | undefined): { month: string; from: string; to: string } {
  const valid = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : todayStr().slice(0, 7);
  const [year, mon] = valid.split('-').map(Number);
  const from = `${valid}-01`;
  const lastDay = new Date(year, mon, 0).getDate(); // day 0 of next month = last day of this month
  const to = `${valid}-${String(lastDay).padStart(2, '0')}`;
  return { month: valid, from, to };
}

function daysInMonthUTC(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** "YYYY-MM" + a day delta -> the "YYYY-MM" that many months away (delta may be negative). */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [year, mon] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Adds (or subtracts, for a negative `days`) whole days to a "YYYY-MM-DD" date. */
export function addDaysUTC(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Resolves a "YYYY-MM" payroll month key + the admin's configured salary period
 * (HrRules.salaryPeriodFrom/salaryPeriodTo) into the actual {from, to} date range to compute
 * payroll over — handling both a plain calendar month (the default, from=1/to='last') and a
 * custom cycle that wraps into the previous calendar month (e.g. 26th last month to 25th this
 * one). `monthKey` names the cycle by the month it ENDS in — e.g. "26 Jul – 25 Aug" is keyed
 * "2026-08", matching how payroll cycles are conventionally referred to by their payout month.
 */
export function payrollPeriodRange(
  monthKey: string,
  rules: { salaryPeriodFrom: number; salaryPeriodTo: number | string }
): { from: string; to: string } {
  const [year, mon] = monthKey.split('-').map(Number);

  if (rules.salaryPeriodTo === 'last') {
    const fromDay = Math.min(Math.max(rules.salaryPeriodFrom || 1, 1), daysInMonthUTC(year, mon));
    const lastDay = daysInMonthUTC(year, mon);
    return { from: `${monthKey}-${String(fromDay).padStart(2, '0')}`, to: `${monthKey}-${String(lastDay).padStart(2, '0')}` };
  }

  const toDay = Math.min(Math.max(Number(rules.salaryPeriodTo) || 1, 1), daysInMonthUTC(year, mon));
  const to = `${monthKey}-${String(toDay).padStart(2, '0')}`;
  const fromDay = rules.salaryPeriodFrom || 1;

  if (fromDay <= toDay) {
    // Same-month period, e.g. 1st-25th.
    const clampedFrom = Math.min(fromDay, daysInMonthUTC(year, mon));
    return { from: `${monthKey}-${String(clampedFrom).padStart(2, '0')}`, to };
  }

  // Wraps: the period actually starts in the previous calendar month (e.g. 26th to 25th).
  const prevKey = shiftMonthKey(monthKey, -1);
  const [prevYear, prevMon] = prevKey.split('-').map(Number);
  const clampedFrom = Math.min(fromDay, daysInMonthUTC(prevYear, prevMon));
  return { from: `${prevKey}-${String(clampedFrom).padStart(2, '0')}`, to };
}

/** Which payroll cycle (by its end-month key) today falls inside, given the admin's
 * configured salary period — the period-aware replacement for "just use today's calendar
 * month," needed once a cycle can wrap across two calendar months. */
export function currentPayrollMonthKey(rules: { salaryPeriodFrom: number; salaryPeriodTo: number | string }): string {
  const today = todayStr();
  let key = today.slice(0, 7);
  const { from, to } = payrollPeriodRange(key, rules);
  if (today > to) key = shiftMonthKey(key, 1);
  else if (today < from) key = shiftMonthKey(key, -1);
  return key;
}

/** The most recently COMPLETED payroll cycle — one cycle behind currentPayrollMonthKey (which
 * names whichever cycle today currently falls inside, including one that's still running).
 * "Run Payroll" only ever unlocks once a cycle has fully ended (see computePayrollForMonth's
 * canRun), so this — not the in-progress cycle — is what the Payroll page should actually show
 * and act on: it flips over to a freshly-ended cycle (e.g. 26 Aug – 25 Sep) the instant the next
 * one starts (26 Sep), and stays pointed at it for that entire following cycle's length, giving
 * the admin weeks — not a handful of days — to check the numbers and re-run as many times as
 * they want before it naturally rolls over again. */
export function payrollCycleToRunKey(rules: { salaryPeriodFrom: number; salaryPeriodTo: number | string }): string {
  return shiftMonthKey(currentPayrollMonthKey(rules), -1);
}

/** Every "YYYY-MM-DD" date from `from` to `to` inclusive — built entirely from UTC components
 * (never local-time getters on a parsed date string) so day-of-week/date-count math can't
 * silently shift by a day depending on the server's local timezone. */
export function eachDateInRange(from: string, to: string): string[] {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  const dates: string[] = [];
  for (let t = start; t <= end; t += 86400000) {
    const d = new Date(t);
    dates.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`);
  }
  return dates;
}

export function isSunday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 0;
}
