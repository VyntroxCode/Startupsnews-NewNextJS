import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import type { SponsorEventSubmission } from '../domain/types';

/** The "Filter: page leads" value the admin Sales Tracker's "All leads" table offers for these —
 * see components/admin/sales-tracker/constants.ts's PAGE_LEAD_TYPES, which must keep this in sync. */
export const SPONSOR_EVENT_PAGE_LEAD_TYPE = 'Sponsor Event Page Leads';

/** Mirrors a Partner / Sponsor an Event submission into sales_leads so the team can work it like
 * any other lead (status, assignee, follow-up dates). The full event record — poster, description,
 * schedule — lives in sponsor_event_submissions and is shown by the Sales Tracker's own "Sponsor
 * Event submissions" card; this row only carries a one-line summary of it in `query`.
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
    assignedTo: '',
    status: 'Query received',
    nextFollowUpDate: '',
    lastConnectDate: '',
    lastCallDiscussion: '',
  };
}
