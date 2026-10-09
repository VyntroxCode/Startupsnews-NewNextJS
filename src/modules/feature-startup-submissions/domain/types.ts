/** One /feature-your-startup form submission, as the admin Sales Tracker sees it. Type-only on
 * purpose (plus the error class) — the admin client components import this file directly. */
export interface FeatureStartupSubmission {
  id: string;
  name: string;
  companyName: string;
  /** Composed "+91 9876543210" — the same canonical string the public form builds. */
  phone: string;
  email: string;
  website: string;
  /** The picked country, or what was typed under "Other (add manually)". Required on new submissions (older rows may be empty). */
  country: string;
  city: string;
  /** The form's optional "Tell us more" box — free text, line breaks kept. */
  tellUsMore: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeatureStartupSubmissionEntity {
  id: string;
  name: string;
  company_name: string;
  phone: string;
  email: string;
  website: string | null;
  country: string | null;
  city: string | null;
  tell_us_more: string | null;
  created_at: string;
  updated_at: string;
}

/** The editable fields — what the public form posts and what an admin edit saves. */
export type FeatureStartupSubmissionInput = Omit<FeatureStartupSubmission, 'id' | 'createdAt' | 'updatedAt'>;

/** Bad input from the submitter/admin (→ 400), as opposed to a server/database failure (→ 500). */
export class FeatureStartupValidationError extends Error {}
