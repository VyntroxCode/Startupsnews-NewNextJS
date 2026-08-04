/**
 * Weighted header/column detection, ported from clean_contacts.py's
 * HEADER_MAP / _match_score / find_columns / find_header_row.
 *
 * Each field maps to a list of (pattern, weight). Weight is hand-picked to
 * reflect true specificity, so a more specific header always wins a
 * conflict -- e.g. "Startup Name" (95) beats the generic "Company" (65) for
 * the `company` field, and "Email Address" (100) always wins over the low
 * generic `address` signal used for city (25).
 */
import { NAME_HEADER_BLOCK } from './name-clean';

export type ContactField =
  | 'name' | 'company' | 'types' | 'cities' | 'country' | 'emails' | 'phones'
  | 'linkedin' | 'instagram' | 'sector' | 'stage' | 'tags' | 'notes';

const HEADER_MAP: Record<ContactField, [RegExp, number][]> = {
  name: [
    [/full name/, 90], [/contact name/, 90], [/founder name/, 90],
    [/contact person/, 85], [/\bspoc\b/, 70], [/\bpoc\b/, 60],
    [/\bperson\b/, 40], [/\bname\b/, 50],
  ],
  company: [
    [/startup name/, 95], [/business name/, 90], [/organi[sz]ation/, 85],
    [/investor name/, 85], [/fund name/, 85], [/vc name/, 80],
    [/ci\/vc/, 80], [/\bfirm\b/, 60], [/\borg\b/, 55], [/compan/, 65],
  ],
  phones: [
    [/contact number/, 90], [/contact no/, 85], [/contact detail/, 80],
    [/whatsapp/, 80], [/\bmobile\b/, 75], [/\bphone\b/, 75],
    [/\bmob\b/, 55], [/\bph\b/, 50], [/^numbers?$/, 45],
  ],
  emails: [
    [/email address/, 100], [/mail address/, 95], [/email id/, 95],
    [/mail id/, 90], [/e[-\s]?mail/, 85], [/\bmail\b/, 45],
  ],
  cities: [
    [/^city$/, 100], [/^town$/, 95], [/current city/, 90], [/home city/, 90],
    [/city\/town/, 90], [/\bcity\b/, 80], [/based in/, 70], [/current location/, 65],
    [/^location$/, 65], [/\blocation\b/, 55], [/^region$/, 55], [/\bcity\//, 55],
    [/\/city/, 55], [/\bdistrict\b/, 55], [/\blocality\b/, 55], [/resid(ing|ence)/, 50],
    [/living in/, 45], [/^place$/, 45], [/\bplace\b/, 30],
    [/(mailing|postal|correspondence|residential|full) address/, 60],
    [/\baddress\b/, 25],
  ],
  types: [[/^type$/, 60], [/\btype\b/, 40], [/\bcategory\b/, 40], [/\brole\b/, 35]],
  country: [[/^country$/, 100], [/\bcountry\b/, 80], [/^nation$/, 60]],
  linkedin: [[/linkedin/, 80], [/^li$/, 40]],
  instagram: [[/instagram/, 80], [/^insta$/, 60], [/^ig$/, 40]],
  sector: [[/sector/, 70], [/industry/, 65], [/vertical/, 55], [/domain/, 40]],
  stage: [[/funding stage/, 80], [/^stage$/, 70], [/^round$/, 55], [/^level$/, 40]],
  tags: [[/tags?/, 60], [/labels?/, 50], [/keywords/, 45]],
  notes: [[/notes?/, 55], [/remarks?/, 50], [/comments?/, 50], [/description/, 40], [/details/, 35]],
};

// A header that looks like an email/phone/company column can NEVER be read as
// "cities" -- stops "Email Address" from falling through to city just
// because it contains the word "address".
const CITY_EXCLUDE = /e-?mail|\bmail\b|phone|mobile|whatsapp|contact\s*no|contact\s*number|compan/i;
// "name" alone is also excluded from city, but only when the header has no
// city signal of its own -- "City Name" must still match city.
const CITY_NAME_WORD = /\bname\b/i;
const CITY_SIGNAL_WORD = /\bcity\b|\btown\b/i;

function matchScore(headerText: unknown, field: ContactField): number {
  if (headerText == null) return 0;
  const h = String(headerText).trim().toLowerCase();
  if (!h) return 0;
  if (field === 'cities') {
    if (CITY_EXCLUDE.test(h)) return 0;
    if (CITY_NAME_WORD.test(h) && !CITY_SIGNAL_WORD.test(h)) return 0;
  }
  let best = 0;
  for (const [pattern, weight] of HEADER_MAP[field]) {
    if (pattern.test(h)) best = Math.max(best, weight);
  }
  return best;
}

/** Assigns each column to its best-fitting field, resolving conflicts by which
 * (column, field) pairing is the most specific (highest-weight) match. */
export function findColumns(headerRow: unknown[]): Partial<Record<ContactField, number>> {
  const candidates: [number, number, ContactField][] = []; // [score, colIdx, field]
  headerRow.forEach((cell, idx) => {
    if (cell == null) return;
    const htxt = String(cell).trim();
    if (!htxt) return;
    // real headers are short labels; long/sentence-like cells are body text
    if (htxt.length > 45 || htxt.split(/\s+/).length > 6) return;
    for (const field of Object.keys(HEADER_MAP) as ContactField[]) {
      if (field === 'name' && NAME_HEADER_BLOCK.test(htxt)) continue; // e.g. "Upcoming Events"
      const s = matchScore(cell, field);
      if (s > 0) candidates.push([s, idx, field]);
    }
  });
  candidates.sort((a, b) => b[0] - a[0]);
  const cols: Partial<Record<ContactField, number>> = {};
  const usedCols = new Set<number>();
  for (const [, idx, field] of candidates) {
    if (cols[field] !== undefined || usedCols.has(idx)) continue;
    cols[field] = idx;
    usedCols.add(idx);
  }
  return cols;
}

/** Finds the row most likely to be the header row (most field matches, with
 * at least one of name/phones/emails present). */
export function findHeaderRow(rows: unknown[][], scan = 15): { headerIdx: number | null; cols: Partial<Record<ContactField, number>> } {
  let bestIdx: number | null = null;
  let bestScore = 0;
  let bestCols: Partial<Record<ContactField, number>> = {};
  for (let i = 0; i < Math.min(scan, rows.length); i++) {
    const cols = findColumns(rows[i]);
    const score = Object.keys(cols).length;
    const signal = (['name', 'phones', 'emails'] as ContactField[]).filter((f) => cols[f] !== undefined).length;
    if (score > bestScore && signal >= 1) {
      bestIdx = i; bestScore = score; bestCols = cols;
    }
  }
  return { headerIdx: bestIdx, cols: bestCols };
}
