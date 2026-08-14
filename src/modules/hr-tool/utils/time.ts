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
