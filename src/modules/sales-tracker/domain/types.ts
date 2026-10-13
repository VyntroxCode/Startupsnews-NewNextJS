/** Longest "Tell us more" a public lead form accepts — one limit for every form and the server. */
export const TELL_US_MORE_MAX_LENGTH = 2000;

/** The channels a lead added by hand can be filed under ("Type of lead"). Page leads carry their
 * page's own type instead (see components/admin/sales-tracker/constants.ts PAGE_LEAD_TYPES) and
 * are never picked by hand. */
export const MANUAL_LEAD_TYPES = ['Social Media', 'Events', 'PR-National', 'PR-International', 'Others'] as const;

export interface SalesLead {
  id: string;
  date: string;
  name: string;
  company: string;
  contact: string;
  email: string;
  country: string;
  city: string;
  source: string;
  type: string;
  otherType: string;
  query: string;
  assignedTo: string;
  status: string;
  nextFollowUpDate: string;
  lastConnectDate: string;
  lastCallDiscussion: string;
  /** Event-specific fields, populated only for a "Sponsor Event Page Leads" row (mirrored in full
   * from sponsor_event_submissions, see modules/sponsor-event-submissions/service/to-sales-lead.ts)
   * — empty string for every other lead. Editable here like the rest of the row; the original
   * sponsor_event_submissions row is left untouched, same as the other page-lead mirrors. */
  eventTitle: string;
  eventSlug: string;
  eventDate: string;
  eventTime: string;
  externalUrl: string;
  posterUrl: string;
  description: string;
  /** Populated only for an "Advertise Page Leads" row (mirrored from advertise_submissions, see
   * modules/advertise-submissions/service/to-sales-lead.ts) — empty for every other lead. */
  budgetRange: string;
  campaignGoal: string;
  /** What the visitor wrote in the public form's optional "Tell us more" box (Feature Your Startup,
   * Funding Round, Press Release, Advertise With Us). Read-only in the lead window: the repository
   * writes it on insert only, so a later save can never change the visitor's words. */
  tellUsMore: string;
  /** Who added the lead (see scripts/migrations/add-sales-lead-created-by.sql). Written by the
   * server when the lead is inserted and never changed afterwards — whatever a request sends here
   * is ignored. `createdByCredentialId` is the HR login of an employee who added it from My Leads
   * (null for an admin's or a website lead); `createdByName` is the employee's or admin's name
   * ('' for a website lead and for leads older than the column). */
  createdByCredentialId?: number | null;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesLeadEntity {
  id: string;
  lead_date: string | null;
  name: string;
  company: string | null;
  contact: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
  source: string | null;
  type: string | null;
  other_type: string | null;
  query_text: string | null;
  event_title: string | null;
  event_slug: string | null;
  event_date: string | null;
  event_time: string | null;
  external_url: string | null;
  poster_url: string | null;
  description: string | null;
  budget_range: string | null;
  campaign_goal: string | null;
  tell_us_more: string | null;
  assigned_to: string | null;
  status: string | null;
  next_follow_up_date: string | null;
  last_connect_date: string | null;
  last_call_discussion: string | null;
  created_by_credential_id: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type SalesLeadInput = Omit<SalesLead, 'createdAt' | 'updatedAt'>;
