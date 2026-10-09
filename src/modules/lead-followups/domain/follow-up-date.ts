/** The "Next follow-up date" rules, shared by the admin Sales Tracker, My Leads and the server
 * (columns: scripts/migrations/add-next-follow-up-dates.sql).
 *
 * Every person keeps their own date on a lead: the admin's is the lead's own column
 * (sales_leads / ens_travel_enquiries .next_follow_up_date), an assigned employee's sits on their
 * sales_lead_assignments row. A date is compulsory while the lead is still open (Pending /
 * Follow Up) and not asked for once it is Confirmed / Not Interested.
 *
 * "Today's Follow up" lists a person's open leads whose date is today or already past (overdue).
 * A lead leaves it when that person sets a later date or the lead is closed.
 *
 * Plain data with no server imports. */

import { type AssignmentStatus, FINISHED_LEAD_STATUSES } from '@/modules/lead-assignments/domain/types';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day written "YYYY-MM-DD". */
export function isIsoDay(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DAY.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Today as "YYYY-MM-DD" on the reader's own clock (not UTC, which is still yesterday until 05:30 IST). */
export function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Whether a lead in this status must carry a next follow-up date: only while it is still open. */
export function statusNeedsFollowUpDate(status: AssignmentStatus): boolean {
  return !FINISHED_LEAD_STATUSES.includes(status);
}

/** Where a date stands against `today`: 'today', 'overdue' (already past), 'upcoming', or 'none'
 * when there is no date. */
export type FollowUpDue = 'none' | 'today' | 'overdue' | 'upcoming';

export function followUpDue(date: string | null | undefined, today: string): FollowUpDue {
  const day = (date || '').slice(0, 10);
  if (!ISO_DAY.test(day)) return 'none';
  if (day === today) return 'today';
  return day < today ? 'overdue' : 'upcoming';
}

/** True when the date puts the lead in "Today's Follow up": due today or overdue. */
export function isFollowUpDue(date: string | null | undefined, today: string): boolean {
  const due = followUpDue(date, today);
  return due === 'today' || due === 'overdue';
}

/** The tag a due lead carries wherever it is listed: "Overdue" (red) or "Today" (amber). Tailwind
 * classes written out in full so the scanner finds them: `tag` is the label pill, `strip` the
 * coloured band down the left edge of the lead's row, `text` the matching text colour. */
export const FOLLOW_UP_TAG: Record<'today' | 'overdue', { label: string; tag: string; strip: string; text: string }> = {
  overdue: { label: 'Overdue', tag: 'bg-red-600 text-white', strip: 'border-l-red-600', text: 'text-red-700' },
  today: { label: 'Today', tag: 'bg-amber-500 text-white', strip: 'border-l-amber-500', text: 'text-amber-700' },
};

/** A lead's one tag from several people's dates: overdue wins over today; null when none is due. */
export function worstFollowUpDue(dates: (string | null | undefined)[], today: string): 'today' | 'overdue' | null {
  let state: 'today' | 'overdue' | null = null;
  for (const d of dates) {
    const due = followUpDue(d, today);
    if (due === 'overdue') return 'overdue';
    if (due === 'today') state = 'today';
  }
  return state;
}

/** "2026-10-12" → "12 Oct 2026". Anything else is returned as it came. */
export function formatFollowUpDay(date: string | null | undefined): string {
  const day = (date || '').slice(0, 10);
  if (!ISO_DAY.test(day)) return date || '';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
