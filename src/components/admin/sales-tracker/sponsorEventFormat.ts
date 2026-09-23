/** Display helpers shared by the Sales Tracker's Expand North Star enquiry views. (Used to also
 * serve the Sponsor Event submissions card/modal, removed 2026-09-23 once that data moved into the
 * unified "All leads" table — `todayKey` / `formatEventDate` / `formatEventTime` existed only for
 * those and were removed with them.) */

/** created_at arrives as the DB's own "2026-09-14 12:44:00" (no "T", no zone). Chrome parses that,
 * Safari returns Invalid Date — so normalise to "2026-09-14T12:44:00" (read as local time) first. */
function timestampMs(value?: string): number {
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

export function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}
