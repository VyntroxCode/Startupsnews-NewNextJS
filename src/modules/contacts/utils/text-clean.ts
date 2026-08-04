/**
 * Shared cell-text cleanup, ported from clean_contacts.py's `clean()`.
 * Used before any field-specific parsing so stray whitespace/markup from a
 * pasted-from-web spreadsheet never leaks into a stored value.
 */
// Stray artifacts from copy/pasted web content: NBSP, zero-width space, BOM.
// Built from char codes (rather than literal characters) so the source file
// never contains invisible/control bytes that editors and diffs can mangle.
const NBSP = String.fromCharCode(0xa0);
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
const BOM = String.fromCharCode(0xfeff);

export function cleanText(v: unknown): string {
  if (v == null) return '';
  let s = String(v);
  s = s.split(NBSP).join(' ').split(ZERO_WIDTH_SPACE).join('').split(BOM).join('');
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.endsWith('.0') && /^\d+$/.test(s.slice(0, -2))) s = s.slice(0, -2);
  return s;
}
