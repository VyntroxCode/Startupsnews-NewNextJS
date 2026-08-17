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
