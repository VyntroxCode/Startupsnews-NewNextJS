import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import type { SponsorEventSubmission } from '../domain/types';

/** The "Filter: page leads" value the admin Sales Tracker's "All leads" table offers for these —
 * see components/admin/sales-tracker/constants.ts's PAGE_LEAD_TYPES, which must keep this in sync. */
export const SPONSOR_EVENT_PAGE_LEAD_TYPE = 'Sponsor Event Page Leads';

/** Mirrors a Partner / Sponsor an Event submission into sales_leads so the team can work it like
 * any other lead (status, assignee, follow-up dates) — and, since the unified "All leads" table
 * added Event columns, now carries the full event record (title, schedule, poster, description,
 * link) too, not just a one-line summary. sponsor_event_submissions remains the untouched original
 * archive; this row is the editable working copy, same as the other page-lead mirrors.
 *
 * The form collects no company, so `company` is left empty rather than filled with something that
 * isn't one. Same id as the submission, so `upsertLead` (ON DUPLICATE KEY UPDATE on id) can never
 * create a second lead for it. */
export function submissionToSalesLead(submission: SponsorEventSubmission): SalesLead {
  const createdAt = submission.createdAt ? new Date(submission.createdAt) : new Date();
  const date = Number.isNaN(createdAt.getTime()) ? new Date().toISOString().slice(0, 10) : createdAt.toISOString().slice(0, 10);

  const query = [
    `Sponsor / partner an event: ${submission.eventTitle}`,
    `When: ${submission.eventDate} ${submission.eventTime}`,
    `Where: ${submission.location}`,
    submission.externalUrl ? `Event link: ${submission.externalUrl}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    id: submission.id,
    date,
    name: submission.contactName,
    company: '',
    contact: submission.phone,
    email: submission.contactEmail,
    country: submission.country,
    city: submission.city,
    source: 'Sponsor an Event',
    type: SPONSOR_EVENT_PAGE_LEAD_TYPE,
    otherType: '',
    query,
    eventTitle: submission.eventTitle,
    eventSlug: submission.eventSlug,
    eventDate: submission.eventDate,
    eventTime: submission.eventTime,
    externalUrl: submission.externalUrl,
    posterUrl: submission.posterUrl,
    description: submission.description,
    assignedTo: '',
    status: 'Query received',
    nextFollowUpDate: '',
    lastConnectDate: '',
    lastCallDiscussion: '',
  };
}
