/**
 * Shared date/time labels for public event cards and the event detail page.
 *
 * Both event sources build a StartupEvent — `partnership-events/utils/public-event.utils.ts`
 * (the live source) and `events/utils/events.utils.ts` (legacy `events` table) — and each used to
 * carry its own copy of buildDateRange. They live here instead so the two can't drift: a card and
 * a detail page rendering the same event must not disagree about how its date reads.
 */

/** Three-letter, title case — "15 Sep - 17 Sep 2026". Deliberately NOT the uppercase four-letter
 * MONTH_ABBR ('SEPT') those two files still use for StartupEvent.date: that string is parsed back
 * by eventDateSortKey, so changing it would break /events' ordering. */
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toYmd(d: Date | string): { year: number; month: number; day: number } {
  if (d instanceof Date) {
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  const [year, month, day] = d.slice(0, 10).split('-').map(Number);
  return { year, month, day };
}

/**
 * "15 Sep 2026", or "15 Sep - 17 Sep 2026" / "15 Sep 2026 - 5 Jan 2027" when an end date is set
 * and differs from the start — one clean label for cards and the detail page alike. The year is
 * printed once when both ends share it.
 */
export function buildDateRange(start: Date | string, end: Date | string | null | undefined): string {
  const s = toYmd(start);
  const startLabel = `${s.day} ${MONTH_SHORT[s.month - 1]} ${s.year}`;
  if (!end) return startLabel;
  const e = toYmd(end);
  if (e.year === s.year && e.month === s.month && e.day === s.day) return startLabel;
  const endMonthDay = `${e.day} ${MONTH_SHORT[e.month - 1]}`;
  if (e.year === s.year) return `${s.day} ${MONTH_SHORT[s.month - 1]} - ${endMonthDay} ${s.year}`;
  return `${startLabel} - ${endMonthDay} ${e.year}`;
}

/** "18:30" / "18:30:00" / a Date -> { h, m }, or null when it isn't a time at all. */
function toHm(value: string | Date | null | undefined): { h: number; m: number } | null {
  if (!value) return null;
  if (value instanceof Date) return { h: value.getHours(), m: value.getMinutes() };
  const [h, m] = value.slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return { h, m };
}

/** 13:05 -> "1:05 PM", 09:00 -> "9:00 AM", 00:00 -> "12:00 AM". */
function formatClock({ h, m }: { h: number; m: number }): string {
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * "10:00 AM", or "10:00 AM - 6:00 PM" when an end time is set and differs. Empty string when
 * there is no usable time, which is the signal callers use to render nothing at all.
 *
 * Midnight is treated as "no time given" rather than shown as 12:00 AM: the admin form defaults
 * an unset time to 00:00, so displaying it would put a wrong start time on every event whose
 * organiser simply never filled it in. An end time of 00:00 is dropped for the same reason.
 */
export function buildTimeRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  const s = toHm(start);
  if (!s || (s.h === 0 && s.m === 0)) return '';
  const startLabel = formatClock(s);
  const e = toHm(end);
  if (!e || (e.h === 0 && e.m === 0) || (e.h === s.h && e.m === s.m)) return startLabel;
  return `${startLabel} - ${formatClock(e)}`;
}
