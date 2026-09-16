/** One /submit-press-release form submission, as the admin Sales Tracker sees it. Type-only on
 * purpose (plus the error class) — the admin client components import this file directly.
 *
 * Same field set as funding-round-submissions/domain/types.ts on purpose: the public
 * /submit-press-release page collects exactly the six shared lead-form fields (see
 * components/press-release-submit/steps/) and nothing release-specific — no headline, release
 * text or PDF field exists anywhere in this data model. */
export interface PressReleaseSubmission {
  id: string;
  name: string;
  companyName: string;
  /** Composed "+91 9876543210" — the same canonical string the public form builds. */
  phone: string;
  email: string;
  website: string;
  /** The picked country, or what was typed under "Other (add manually)". Empty if not given. */
  country: string;
  city: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PressReleaseSubmissionEntity {
  id: string;
  name: string;
  company_name: string;
  phone: string;
  email: string;
  website: string | null;
  country: string | null;
  city: string | null;
  created_at: string;
  updated_at: string;
}

/** The editable fields — what the public form posts and what an admin edit saves. */
export type PressReleaseSubmissionInput = Omit<PressReleaseSubmission, 'id' | 'createdAt' | 'updatedAt'>;

/** Bad input from the submitter/admin (→ 400), as opposed to a server/database failure (→ 500). */
export class PressReleaseValidationError extends Error {}
