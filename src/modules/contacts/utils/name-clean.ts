/**
 * Name-column junk/banner filtering, ported from clean_contacts.py:
 * JUNK_NAME / EVENT_VALUE / NAME_HEADER_BLOCK / _is_junk_name /
 * _looks_like_phone_not_name / _blank_repeated_banner_names.
 */

// column headers that must NEVER be treated as the Name column (e.g. "Upcoming Events")
export const NAME_HEADER_BLOCK = /upcoming|event|program|summit|conclave|mixer|yatra|fiesta|edition|session|webinar|meetup|workshop|conference|expo\b/i;

// values that are clearly event/banner titles, not a person's name
const EVENT_VALUE = /upcoming events?|accelerator program|startup xchange|most preferred workplace|fashion fiesta|investors? summit|blockchain yatra|craccon|xccelerate conclave|\bmixer\b|\bconclave\b|annual edition/i;

export function isEventBannerValue(s: string): boolean {
  return !!s && EVENT_VALUE.test(s);
}

// hashtag captions, bare parenthetical codes, placeholder dashes/dots -- not a person's name
const JUNK_NAME = /^#|^\(.*\)$|^[-.–—_\s]+$/;
// any emoji at all -> a caption/series title, not a real contact name
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2300}-\u{23FF}]/u;

export function isJunkName(n: string): boolean {
  if (!n) return false;
  const s = n.trim();
  if (!s) return false;
  if (JUNK_NAME.test(s)) return true;
  if (EMOJI_RE.test(s)) return true;
  if (!/[A-Za-z]/.test(s)) return true; // no letters at all -> emoticon/placeholder
  return false;
}

/** True when a "name" cell is really just a phone number (optionally with a short
 * label like "Mob"/"Tel" stuck to it). Scoped to the Name field only -- company
 * names legitimately contain lots of digits (100X.VC, 8i Ventures). */
export function looksLikePhoneNotName(s: string): boolean {
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7) return false;
  const nonPhoneChars = s.replace(/[\d\s\-+().]/g, '');
  return nonPhoneChars.length <= 8;
}

/** Normalizes a name for duplicate-matching / banner-detection comparisons
 * (letters only, collapsed whitespace) -- NOT for display. */
export function normNameForMatch(n: string): string {
  if (!n) return '';
  return n.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();
}

interface BannerCandidate {
  name: string;
  emails: string[];
  phones: string[];
}

/**
 * Catches event/banner text that ended up in the Name column, without relying
 * on a hardcoded list of event titles: if the exact same name string is
 * attached to many DIFFERENT phone/email values within a single sheet, that
 * string isn't a person -- it's a title/label that got read into every row.
 * Scope: per-sheet only. ONLY ever blanks `name` -- phone/email/etc are
 * untouched, so a contact with a blanked name but a real phone/email is still
 * kept.
 */
export function blankRepeatedBannerNames<T extends BannerCandidate>(records: T[], minCount = 5, minRatio = 0.3): T[] {
  const groups = new Map<string, number[]>();
  records.forEach((rec, i) => {
    const nm = normNameForMatch(rec.name);
    if (!nm) return;
    const bucket = groups.get(nm);
    if (bucket) bucket.push(i);
    else groups.set(nm, [i]);
  });
  const total = records.length;
  for (const idxs of groups.values()) {
    if (idxs.length < minCount) continue;
    const distinctContacts = new Set(idxs.map((i) => `${records[i].emails.join(',')}|${records[i].phones.join(',')}`));
    if (distinctContacts.size < minCount) continue;
    if (idxs.length < 8 && idxs.length / Math.max(total, 1) < minRatio) continue;
    for (const i of idxs) records[i].name = '';
  }
  return records;
}
