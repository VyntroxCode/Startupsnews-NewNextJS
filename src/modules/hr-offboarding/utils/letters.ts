import { COMPANY, mergeTemplate, ordinalDate } from '@/components/admin/hr-tool/utils';

/*
 * Relieving and Experience letters. The text comes from the HR tool's templates (Company Profile →
 * "Relieving Letter" / "Experience Letter"), falling back to the defaults below while a template is
 * empty. What was issued is snapshotted on the case (hr_offboarding.letters) — a later template edit
 * never changes a letter someone already has — and the PDF is rebuilt from that snapshot on request.
 */

export const LETTER_TYPES = ['relieving', 'experience'] as const;
export type LetterType = (typeof LETTER_TYPES)[number];

export function isLetterType(v: unknown): v is LetterType {
  return typeof v === 'string' && (LETTER_TYPES as readonly string[]).includes(v);
}

export const LETTER_TEMPLATE_NAME: Record<LetterType, string> = {
  relieving: 'Relieving Letter',
  experience: 'Experience Letter',
};
export const LETTER_TITLE: Record<LetterType, string> = {
  relieving: 'Relieving Letter',
  experience: 'Experience Letter',
};

/** Merge tags the offboarding letters understand (also listed in the template editor). */
export const LETTER_MERGE_TAGS = [
  'employee_name', 'employee_id', 'designation', 'team', 'doj', 'lwd', 'tenure', 'today', 'company_name', 'brand',
] as const;

const DEFAULTS: Record<LetterType, string> = {
  relieving: `Date: {{today}}

To,
{{employee_name}}
Employee ID: {{employee_id}}

Subject: Relieving Letter

Dear {{employee_name}},

This is to confirm that you have been relieved from the position of {{designation}} at {{company_name}} with effect from the close of business on {{lwd}}.

Your clearance formalities have been completed and your full and final settlement has been processed.

We thank you for your contribution to {{brand}} and wish you every success in the future.

For {{company_name}}


Authorised Signatory`,
  experience: `Date: {{today}}

TO WHOMSOEVER IT MAY CONCERN

EXPERIENCE CERTIFICATE

This is to certify that {{employee_name}} (Employee ID: {{employee_id}}) was employed with {{company_name}} as {{designation}} in the {{team}} team from {{doj}} to {{lwd}} ({{tenure}}).

We wish {{employee_name}} all the best in their future endeavours.

For {{company_name}}


Authorised Signatory`,
};

export interface LetterData {
  employeeName: string;
  employeeCode: string;
  designation: string;
  team: string;
  doj: string;
  lwd: string;
  today: string;
}

/** "2 years 3 months", "5 months", "less than a month". */
export function tenureLabel(from: string, to: string): string {
  if (!from || !to || to < from) return '';
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  let months = (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
  if (months < 1) return 'less than a month';
  const years = Math.floor(months / 12);
  months %= 12;
  const parts = [];
  if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  return parts.join(' ');
}

/** The merged letter text, or the unknown merge tags that would otherwise print as raw {{…}}. */
export function buildLetterText(type: LetterType, template: string | null | undefined, d: LetterData): { text: string; unknownTags: string[] } {
  const source = template && template.trim() ? template : DEFAULTS[type];
  const text = mergeTemplate(source, {
    employee_name: d.employeeName,
    employee_id: d.employeeCode || '—',
    designation: d.designation || '—',
    team: d.team || '—',
    doj: d.doj ? ordinalDate(d.doj) : '—',
    lwd: ordinalDate(d.lwd),
    tenure: tenureLabel(d.doj, d.lwd) || '—',
    today: ordinalDate(d.today),
    company_name: COMPANY.name,
    brand: COMPANY.brand,
  });
  const unknownTags = [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
  return { text, unknownTags };
}
