/**
 * Round-size text → USD millions. Shared by the import route, manual entry and edits so every row
 * is stored in one unit. Returns null for "Undisclosed", blanks and anything without a number.
 *
 *   "$93 Mn" → 93      "$1.2bn" → 1200     "$500K" → 0.5     "USD 12 million" → 12
 *   "₹50 Cr" → 6.024   "INR 80 Lakh" → 0.096 (at INR_PER_USD)  "93" → 93 (bare numbers are USD Mn)
 *   "$2,500,000" → 2.5 (a bare number ≥ 10,000 is whole dollars)
 */

/** One rupee rate for every INR amount. Change here only — amounts are converted at write time,
 * so rows already stored keep the rate they were saved with. */
export const INR_PER_USD = 83;

/** A unit-less number at or above this is whole currency units, not millions. */
const BARE_WHOLE_UNITS_FROM = 10_000;

/** Multiplier to whole currency units for the word right after the number. */
const UNIT_MULTIPLIER: Record<string, number> = {
  k: 1e3, thousand: 1e3,
  l: 1e5, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5,
  m: 1e6, mn: 1e6, mil: 1e6, million: 1e6, millions: 1e6,
  cr: 1e7, crore: 1e7, crores: 1e7,
  b: 1e9, bn: 1e9, billion: 1e9, billions: 1e9,
};

export function parseAmountToUsdMn(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? round3(raw) : null;

  const text = String(raw).trim().toLowerCase();
  if (!text || /undisclosed|unknown|n\/a|^na$|^-+$/.test(text)) return null;

  const match = text.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*([a-z]+)?/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  const unitWord = match[2] ?? '';
  const multiplier = UNIT_MULTIPLIER[unitWord];
  const isInr = /₹|inr|\brs\b|rupee/.test(text) || unitWord === 'cr' || unitWord.startsWith('crore') || unitWord.startsWith('la');

  if (isInr) {
    // A bare rupee number with no unit is taken as whole rupees.
    const rupees = value * (multiplier ?? 1);
    return round3(rupees / INR_PER_USD / 1e6);
  }

  // USD (default). A bare number is read as millions ("93"), unless it is clearly written out in
  // whole dollars ("$2,500,000") — no real round is 10,000 million dollars.
  if (multiplier) return round3((value * multiplier) / 1e6);
  return round3(value >= BARE_WHOLE_UNITS_FROM ? value / 1e6 : value);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
