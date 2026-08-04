/**
 * Email normalization, ported from clean_contacts.py's norm_email(), plus the
 * placeholder-token guard already used server-side so "N/A"/"test"/"-" style
 * filler values never become a match key.
 */
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PLACEHOLDER_TOKENS = new Set(['n/a', 'na', 'none', 'nil', 'null', 'tbd', 'unknown', 'test', 'xxx', '-', '--', '.']);

export function normalizeEmail(raw: unknown): string {
  if (raw == null) return '';
  const s = String(raw).trim().toLowerCase();
  if (!s || PLACEHOLDER_TOKENS.has(s)) return '';
  return EMAIL_RE.test(s) ? s : '';
}
