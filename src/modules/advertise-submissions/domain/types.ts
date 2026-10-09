export interface AdvertiseSubmission {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  budgetRange: string;
  campaignGoal: string;
  /** The form's optional "Tell us more" box — free text, line breaks kept. */
  tellUsMore: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdvertiseSubmissionEntity {
  id: string;
  name: string;
  company_name: string;
  phone: string;
  email: string;
  country: string | null;
  city: string | null;
  budget_range: string;
  campaign_goal: string;
  tell_us_more: string | null;
  created_at: string;
  updated_at: string;
}

export type AdvertiseSubmissionInput = Omit<AdvertiseSubmission, 'id' | 'createdAt' | 'updatedAt'>;

export class AdvertiseValidationError extends Error {}
