/**
 * Parses an Indian-shorthand money string ("4.5L", "2Cr", "50K", "4,50,000", "450000", "₹4.5 L")
 * into an integer rupee amount. Returns null if nothing numeric could be extracted — callers
 * decide whether that means "invalid" or "untouched" (an empty string is not the same as 0).
 */
export function parseIndianShorthand(input: string): number | null {
  if (input == null) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const stripped = trimmed.replace(/[₹,\s]/g, "");
  const match = stripped.match(/^(-?\d+(?:\.\d+)?)\s*(cr|crore|l|lakh|lac|k)?$/i);
  if (!match) {
    const plain = Number(stripped);
    return Number.isFinite(plain) ? Math.round(plain) : null;
  }

  const amount = parseFloat(match[1]);
  const suffix = (match[2] || "").toLowerCase();
  const multiplier = suffix === "cr" || suffix === "crore" ? 1e7
    : suffix === "l" || suffix === "lakh" || suffix === "lac" ? 1e5
    : suffix === "k" ? 1e3
    : 1;
  return Math.round(amount * multiplier);
}

/** Formats an integer as Indian-grouped digits (last 3 digits, then pairs): 450000 -> "4,50,000". */
export function formatIndianGrouped(n: number): string {
  if (!Number.isFinite(n)) return "";
  const negative = n < 0;
  const digits = String(Math.abs(Math.round(n)));
  if (digits.length <= 3) return (negative ? "-" : "") + digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${rest},${last3}`;
}

/** ₹-prefixed display string for a rupee amount, or "" for an empty/untouched value. */
export function formatIndianCurrency(value: string | number): string {
  if (value === "" || value === null || value === undefined) return "";
  const n = typeof value === "number" ? value : parseIndianShorthand(value);
  return n === null ? "" : `₹${formatIndianGrouped(n)}`;
}
