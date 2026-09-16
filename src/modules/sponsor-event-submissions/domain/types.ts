/** One /sponsor-event form submission, as the admin Sales Tracker's "Sponsor Event submissions"
 * card sees it. Type-only on purpose (plus the error class) — the admin client components import
 * this file directly.
 *
 * Unlike the three shared lead forms (Feature Your Startup, Funding Round, Press Release) this is
 * an EVENT, not a person-and-company lead: title, schedule, poster and description are the point of
 * it, which is why it has its own table and its own card rather than only a sales_leads row. */
export interface SponsorEventSubmission {
  id: string;
  eventTitle: string;
  /** What the form labels "Event URL" — the proposed startupnews.fyi/events/<slug>. */
  eventSlug: string;
  /** Composed "Bengaluru, India" — city first, as the form shows and the email always carried. */
  location: string;
  /** The picked country, or what was typed under "Other (add manually)". Empty if not given. */
  country: string;
  city: string;
  externalUrl: string;
  /** "YYYY-MM-DD", exactly as the form's date input sends it. */
  eventDate: string;
  /** "HH:MM", exactly as the form's time input sends it. */
  eventTime: string;
  description: string;
  /** Public CDN/S3 URL of the poster the visitor uploaded before submitting. */
  posterUrl: string;
  contactName: string;
  contactEmail: string;
  /** Composed "+91 9876543210". Optional on the form. */
  phone: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SponsorEventSubmissionEntity {
  id: string;
  event_title: string;
  event_slug: string;
  location: string;
  country: string | null;
  city: string | null;
  external_url: string | null;
  event_date: string;
  event_time: string;
  description: string;
  poster_url: string;
  contact_name: string;
  contact_email: string;
  phone: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

/** The stored fields — what a validated public submission becomes. */
export type SponsorEventSubmissionInput = Omit<SponsorEventSubmission, 'id' | 'createdAt' | 'updatedAt'>;

/** Bad input from the submitter (→ 400), as opposed to a server/database failure (→ 500). */
export class SponsorEventValidationError extends Error {}
