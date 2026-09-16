import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import type { FeatureStartupSubmission } from '../domain/types';

/** The "Filter: page leads" value the admin Sales Tracker's "All leads" table offers for these —
 * see components/admin/sales-tracker/constants.ts's PAGE_LEAD_TYPES, which must keep this in sync. */
export const FEATURE_PAGE_LEAD_TYPE = 'Feature Page Leads';

/** Mirrors a Feature Your Startup submission into the shape the general Sales Tracker "All leads"
 * table expects (see the caller, /api/feature-your-startup), so every submission also shows up
 * there under the "Feature Page Leads" filter, alongside every other lead source. Reusing the
 * submission's own id as the lead's id keeps the two rows 1:1 — a resubmission with the same id
 * (there isn't one today, but `upsertLead` is `ON DUPLICATE KEY UPDATE` on id regardless) would
 * update the mirrored lead rather than create a second one. */
export function submissionToSalesLead(submission: FeatureStartupSubmission): SalesLead {
  const createdAt = submission.createdAt ? new Date(submission.createdAt) : new Date();
  const date = Number.isNaN(createdAt.getTime()) ? new Date().toISOString().slice(0, 10) : createdAt.toISOString().slice(0, 10);

  return {
    id: submission.id,
    date,
    name: submission.name,
    company: submission.companyName,
    contact: submission.phone,
    email: submission.email,
    // sales_leads has its own Country/City columns (see the Add/Edit lead form's
    // CountryCityFields), so these land there directly rather than folded into free text.
    country: submission.country,
    city: submission.city,
    source: 'Feature Your Startup',
    type: FEATURE_PAGE_LEAD_TYPE,
    otherType: '',
    query: submission.website ? `Website: ${submission.website}` : 'Feature Your Startup form submission.',
    assignedTo: '',
    status: 'Query received',
    nextFollowUpDate: '',
    lastConnectDate: '',
    lastCallDiscussion: '',
  };
}
