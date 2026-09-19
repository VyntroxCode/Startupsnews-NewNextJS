/** Where an /expand-north-star enquiry came from — the two source fields on the closing form:
 *
 *   "Referred by"          — which partner organisation sent the visitor, if any. Optional: most
 *                            visitors were not referred, and a required field with no honest
 *                            answer only teaches people to pick the first row.
 *   "How Did You Find Us"  — the channel, from a fixed list of platforms plus "Others", which
 *                            opens a box for the visitor's own words.
 *
 * One list for both sides, as with participation.ts: the form renders these options, the API only
 * accepts these values, and the Sales Tracker shows and edits them from the same lists. Plain data
 * with no server imports, so the client form can import it. Stored as the `value` (a short slug,
 * fits VARCHAR(40)); shown as the `label`. The partner names are as the team supplied them, with
 * the casing of "Billennium Divas" tidied; five labels were renamed on request 2026-09-19 (`value`
 * unchanged in each case, so stored/past enquiries still resolve correctly): "Venture Wolf" → "Wolf
 * Group", "Xcel Ventures" → "Xccel Ventures", "Startup Report.in" → "Startupreport.in", "HBF DIRECT"
 * → "HBF Direct", "Meet Day.ai" → "meetday.ai". */

export const REFERRED_BY_OPTIONS = [
  { value: 'easy-knowledge-club', label: 'Easy Knowledge Club' },
  { value: 'venture-wolf', label: 'Wolf Group' },
  { value: 'billennium-divas', label: 'Billennium Divas' },
  { value: 'xcel-ventures', label: 'Xccel Ventures' },
  { value: 'confederation-of-indian-startups', label: 'Confederation of Indian Startups' },
  { value: 'usp-house', label: 'USP House' },
  { value: 'startup-report-in', label: 'Startupreport.in' },
  { value: 'tsfp-ventures', label: 'TSFP Ventures' },
  { value: 'angel-bay', label: 'Angel Bay' },
  { value: 'meet-day-ai', label: 'meetday.ai' },
  { value: 'hbf-direct', label: 'HBF Direct' },
  { value: 'indicorn-angels', label: 'Indicornangels' },
] as const satisfies readonly { value: string; label: string }[];

export type ReferredByValue = (typeof REFERRED_BY_OPTIONS)[number]['value'];

export const FOUND_US_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x-twitter', label: 'X (Twitter)' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'google-search', label: 'Google Search' },
  { value: 'startupnews-website', label: 'StartupNews.fyi website / newsletter' },
  { value: 'others', label: 'Others (please specify)' },
] as const satisfies readonly { value: string; label: string }[];

export type FoundUsValue = (typeof FOUND_US_OPTIONS)[number]['value'];

/** The option that asks the visitor to say where in their own words. */
export const FOUND_US_OTHERS: FoundUsValue = 'others';

/** Longest free-text answer accepted under "Others". */
export const FOUND_US_DETAIL_MAX_LENGTH = 200;

/** What the Sales Tracker shows for an enquiry that named no referrer. */
export const NO_REFERRER_LABEL = 'Not referred';

export function isReferredByValue(value: string): value is ReferredByValue {
  return REFERRED_BY_OPTIONS.some((option) => option.value === value);
}

export function isFoundUsValue(value: string): value is FoundUsValue {
  return FOUND_US_OPTIONS.some((option) => option.value === value);
}

export function referredByLabel(value: string): string {
  if (!value) return NO_REFERRER_LABEL;
  return REFERRED_BY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function foundUsLabel(value: string): string {
  return FOUND_US_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

/** "Others — a friend's WhatsApp group" / "LinkedIn": the channel as a person would read it. */
export function foundUsText(value: string, detail: string): string {
  if (!value) return '';
  if (value === FOUND_US_OTHERS) return detail ? `Others — ${detail}` : 'Others';
  return foundUsLabel(value);
}
