/**
 * KYC & Personal Documents — a fixed, HR-policy-defined checklist (PAN, Aadhaar, bank details,
 * education, experience), distinct from the admin-configurable "Required Documents" list in
 * Rules & Org Structure (hr_required_documents, a plain name list with no sub-fields). This one
 * has a real shape per document: some need an associated text field (a PAN/Aadhaar *number*,
 * not just a file), some repeat as several dated entries (education, experience), and each has
 * its own required/optional flag — none of which the old flat HrDocRef{name,status,url} model
 * could express. This file is the single source of truth for that shape, imported by both the
 * employee-facing form and the server-side validation, so they can never drift apart.
 */

export type HrKycStatus = 'not_uploaded' | 'pending' | 'approved' | 'rejected';

/** One filled-in slot — e.g. the employee's PAN card, or their 2nd education entry. `fields`
 * holds whatever extra text the slot's definition calls for (e.g. { number: 'ABCDE1234F' } for
 * PAN, or { qualification, institution, year } for an education entry) — empty object for
 * slots that are just a file (bank statement, cheque, salary slip). */
export interface HrKycSlotValue {
  status: HrKycStatus;
  url: string | null;
  uploadedAt: string | null;
  /** Admin's reason on rejection — shown back to the employee, same convention as HrDocRef. */
  remarks: string | null;
  fields: Record<string, string>;
}

/** Keyed by slot key (see KYC_SLOTS below) — one entry per checklist item. */
export type HrKycDocuments = Record<string, HrKycSlotValue>;

export interface KycFieldDef {
  key: string;
  label: string;
  placeholder?: string;
  /** Validated only when the field is non-empty — required-ness is a property of the *slot*
   * (see KycSlotDef.required), not of individual fields, so a field is never rejected for being
   * blank here; it's rejected for being present-but-malformed. */
  pattern?: RegExp;
  patternMessage?: string;
  transform?: 'uppercase';
}

export interface KycSlotDef {
  key: string;
  label: string;
  required: boolean;
  fields: KycFieldDef[];
}

export interface KycSectionDef {
  title: string;
  slots: KycSlotDef[];
}

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const AADHAAR_PATTERN = /^\d{12}$/;
const YEAR_PATTERN = /^(19|20)\d{2}$/;

function educationFields(): KycFieldDef[] {
  return [
    { key: 'qualification', label: 'Qualification', placeholder: 'e.g. B.Tech, 12th Grade' },
    { key: 'institution', label: 'Institution / Board', placeholder: 'e.g. Delhi University, CBSE' },
    { key: 'year', label: 'Year of Passing', placeholder: 'e.g. 2022', pattern: YEAR_PATTERN, patternMessage: 'Enter a valid 4-digit year' },
  ];
}
function experienceFields(): KycFieldDef[] {
  return [
    { key: 'companyName', label: 'Company Name', placeholder: 'e.g. Acme Corp' },
    { key: 'duration', label: 'Duration', placeholder: 'e.g. Jan 2020 – Dec 2022' },
  ];
}

export const KYC_SECTIONS: KycSectionDef[] = [
  {
    title: 'Identity Proof',
    slots: [
      {
        key: 'pan', label: 'PAN Card', required: true,
        fields: [{ key: 'number', label: 'PAN Number', placeholder: 'ABCDE1234F', pattern: PAN_PATTERN, patternMessage: 'Enter a valid PAN number (format: ABCDE1234F)', transform: 'uppercase' }],
      },
      {
        key: 'aadhaar', label: 'Aadhaar Card', required: true,
        fields: [{ key: 'number', label: 'Aadhaar Number', placeholder: '12-digit number', pattern: AADHAAR_PATTERN, patternMessage: 'Aadhaar number must be exactly 12 digits' }],
      },
    ],
  },
  {
    title: 'Bank Details',
    slots: [
      { key: 'bank_statement', label: 'Bank Statement (3 Months)', required: true, fields: [] },
      { key: 'cheque', label: 'Cancelled Cheque', required: true, fields: [] },
      { key: 'salary_slip', label: 'Last Salary Slip', required: false, fields: [] },
    ],
  },
  {
    title: 'Education',
    slots: [
      { key: 'education_1', label: 'Education 1', required: true, fields: educationFields() },
      { key: 'education_2', label: 'Education 2', required: true, fields: educationFields() },
      { key: 'education_3', label: 'Education 3', required: false, fields: educationFields() },
      { key: 'education_4', label: 'Education 4', required: false, fields: educationFields() },
    ],
  },
  {
    title: 'Experience',
    slots: [
      { key: 'experience_1', label: 'Experience 1', required: false, fields: experienceFields() },
      { key: 'experience_2', label: 'Experience 2', required: false, fields: experienceFields() },
      { key: 'experience_3', label: 'Experience 3', required: false, fields: experienceFields() },
    ],
  },
];

export const KYC_SLOTS: KycSlotDef[] = KYC_SECTIONS.flatMap((s) => s.slots);

export function getKycSlotDef(key: string): KycSlotDef | undefined {
  return KYC_SLOTS.find((s) => s.key === key);
}

export function emptyKycSlotValue(): HrKycSlotValue {
  return { status: 'not_uploaded', url: null, uploadedAt: null, remarks: null, fields: {} };
}

export function emptyKycDocuments(): HrKycDocuments {
  const out: HrKycDocuments = {};
  for (const slot of KYC_SLOTS) out[slot.key] = emptyKycSlotValue();
  return out;
}

/** Fills in any slot missing from a stored/older record with an empty default — keeps this
 * resilient to the checklist gaining new slots after employees already have data saved. */
export function mergeKycDocuments(stored: Partial<HrKycDocuments> | null | undefined): HrKycDocuments {
  const out: HrKycDocuments = {};
  for (const slot of KYC_SLOTS) out[slot.key] = stored?.[slot.key] ? { ...emptyKycSlotValue(), ...stored[slot.key] } : emptyKycSlotValue();
  return out;
}

/** Trims and (if requested) uppercases the raw input, then validates it against the field's
 * pattern — but only when non-empty; a blank value is never itself an error at the field level. */
export function validateKycField(fieldDef: KycFieldDef, rawValue: string): { value: string; error: string | null } {
  let value = (rawValue || '').trim();
  if (fieldDef.transform === 'uppercase') value = value.toUpperCase();
  if (!value) return { value, error: null };
  if (fieldDef.pattern && !fieldDef.pattern.test(value)) return { value, error: fieldDef.patternMessage || `Invalid ${fieldDef.label}` };
  return { value, error: null };
}

/** A slot only counts as "submitted" once it has a file AND (for slots with fields) every one
 * of its fields is filled in and valid — a PAN upload with a blank/garbled number is not
 * complete, and shouldn't count toward profile completion or show as ready for review. */
export function isKycSlotComplete(slotDef: KycSlotDef, value: HrKycSlotValue | undefined): boolean {
  if (!value?.url) return false;
  return slotDef.fields.every((f) => {
    const { value: v, error } = validateKycField(f, value.fields[f.key] || '');
    return !!v && !error;
  });
}

export function isKycSlotSubmitted(value: HrKycSlotValue | undefined): boolean {
  return !!value && (value.status === 'pending' || value.status === 'approved');
}

export function computeKycProgress(documents: HrKycDocuments): { total: number; submitted: number; pct: number } {
  const required = KYC_SLOTS.filter((s) => s.required);
  const submitted = required.filter((s) => isKycSlotSubmitted(documents[s.key])).length;
  const total = required.length;
  return { total, submitted, pct: total ? Math.round((submitted / total) * 100) : 100 };
}
