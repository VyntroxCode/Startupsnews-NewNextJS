/**
 * Contact-type inference from free text, ported from clean_contacts.py's
 * detect_type() -- lets a sheet with no explicit Type/Category column still
 * get classified from words already present in the company name or notes.
 */
const TYPE_PATTERNS: [string, RegExp][] = [
  ['Angel Investor', /\bangel\s*investor/i], ['Angel Fund', /\bangel\s*fund/i],
  ['VC Fund', /\bvc\s*fund|\bventure\s*capital/i], ['Accelerator', /\baccelerator/i],
  ['Incubator', /\bincubat/i], ['E-Cell', /\be[-\s]?cell/i],
  ['Agency', /\bagency\b|\bagencies\b/i], ['Consultant', /\bconsultanc|\bconsulting\b/i],
];

export function detectType(...texts: (string | undefined)[]): string {
  const blob = texts.filter(Boolean).join(' ').toLowerCase();
  for (const [label, pattern] of TYPE_PATTERNS) {
    if (pattern.test(blob)) return label;
  }
  return '';
}
