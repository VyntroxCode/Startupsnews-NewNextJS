import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import type { FundingRoundSubmission } from '../domain/types';

/** The "Filter: page leads" value the admin Sales Tracker's "All leads" table offers for these —
 * see components/admin/sales-tracker/constants.ts's PAGE_LEAD_TYPES, which must keep this in sync. */
export const FUNDING_ROUND_PAGE_LEAD_TYPE = 'Funding Round Page Leads';

/** Mirrors a Submit Your Funding Round submission into the shape the general Sales Tracker
 * "All leads" table expects (see the caller, /api/submit-funding-round), so every submission also
 * shows up there under the "Funding Round Page Leads" filter, alongside every other lead source.
 * Reusing the submission's own id as the lead's id keeps the two rows 1:1 — a resubmission with
 * the same id (there isn't one today, but `upsertLead` is `ON DUPLICATE KEY UPDATE` on id
 * regardless) would update the mirrored lead rather than create a second one.
 *
 * Exactly mirrors feature-startup-submissions/service/to-sales-lead.ts, one data set over — see
 * that file for the fuller rationale. */
export function submissionToSalesLead(submission: FundingRoundSubmission): SalesLead {
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
    source: 'Submit Your Funding Round',
    type: FUNDING_ROUND_PAGE_LEAD_TYPE,
    otherType: '',
    query: submission.website ? `Website: ${submission.website}` : 'Submit Your Funding Round form submission.',
    assignedTo: '',
    status: 'Query received',
    nextFollowUpDate: '',
    lastConnectDate: '',
    lastCallDiscussion: '',
  };
}
