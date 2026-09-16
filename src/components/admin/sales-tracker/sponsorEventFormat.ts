/** Display helpers shared by SponsorEventSubmissionsCard and SponsorEventDetailModal. */

/** Today as "YYYY-MM-DD" in the viewer's own timezone — compared against the stored event_date
 * string, which is the visitor's local calendar date, not a UTC instant. */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** created_at arrives as the DB's own "2026-09-14 12:44:00" (no "T", no zone). Chrome parses that,
 * Safari returns Invalid Date — so normalise to "2026-09-14T12:44:00" (read as local time) first. */
export function timestampMs(value?: string): number {
  if (!value) return NaN;
  return new Date(/^\d{4}-\d{2}-\d{2} \d/.test(value) ? value.replace(' ', 'T') : value).getTime();
}

export function formatSubmittedOn(value?: string): string {
  if (!value) return '';
  const ms = timestampMs(value);
  if (Number.isNaN(ms)) return value;
  const d = new Date(ms);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "2026-10-01" → "01 Oct 2026". Built from the parts, never `new Date("2026-10-01")`, which is
 * parsed as UTC midnight and shows the previous day west of Greenwich. */
export function formatEventDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!m) return date || '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "18:30" / "18:30:00" → "6:30 PM". */
export function formatEventTime(time: string): string {
  const m = /^(\d{2}):(\d{2})/.exec(time || '');
  if (!m) return time || '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

export function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}
