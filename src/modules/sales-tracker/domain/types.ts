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
  assigned_to: string | null;
  status: string | null;
  next_follow_up_date: string | null;
  last_connect_date: string | null;
  last_call_discussion: string | null;
  created_at: string;
  updated_at: string;
}

export type SalesLeadInput = Omit<SalesLead, 'createdAt' | 'updatedAt'>;
