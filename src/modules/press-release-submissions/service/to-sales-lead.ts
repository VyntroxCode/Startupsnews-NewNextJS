import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import type { PressReleaseSubmission } from '../domain/types';

/** The "Filter: page leads" value the admin Sales Tracker's "All leads" table offers for these —
 * see components/admin/sales-tracker/constants.ts's PAGE_LEAD_TYPES, which must keep this in sync. */
export const PRESS_RELEASE_PAGE_LEAD_TYPE = 'Press Release Page Leads';

/** Mirrors a Submit Your Press Release submission into the shape the general Sales Tracker
 * "All leads" table expects (see the caller, /api/submit-press-release), so every submission also
 * shows up there under the "Press Release Page Leads" filter, alongside every other lead source.
 * Reusing the submission's own id as the lead's id keeps the two rows 1:1 — `upsertLead` is
 * `ON DUPLICATE KEY UPDATE` on id, so a repeat save updates the mirrored lead rather than
 * creating a second one.
 *
 * Exactly mirrors funding-round-submissions/service/to-sales-lead.ts, one data set over. */
export function submissionToSalesLead(submission: PressReleaseSubmission): SalesLead {
  const createdAt = submission.createdAt ? new Date(submission.createdAt) : new Date();
  const date = Number.isNaN(createdAt.getTime()) ? new Date().toISOString().slice(0, 10) : createdAt.toISOString().slice(0, 10);

  return {
    id: submission.id,
    date,
    name: submission.name,
    company: submission.companyName,
    contact: submission.phone,
    email: submission.email,
    country: submission.country,
    city: submission.city,
    source: 'Submit Your Press Release',
    type: PRESS_RELEASE_PAGE_LEAD_TYPE,
    otherType: '',
    query: submission.website ? `Website: ${submission.website}` : 'Submit Your Press Release form submission.',
    eventTitle: '',
    eventSlug: '',
    eventDate: '',
    eventTime: '',
    externalUrl: '',
    posterUrl: '',
    description: '',
    assignedTo: '',
    status: 'Query received',
    nextFollowUpDate: '',
    lastConnectDate: '',
    lastCallDiscussion: '',
  };
}
