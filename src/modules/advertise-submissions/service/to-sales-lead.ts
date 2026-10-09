import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import type { AdvertiseSubmission } from '../domain/types';

/** The "Filter: page leads" value the admin Sales Tracker's "All leads" table offers for these —
 * see components/admin/sales-tracker/constants.ts's PAGE_LEAD_TYPES, which must keep this in sync. */
export const ADVERTISE_PAGE_LEAD_TYPE = 'Advertise Page Leads';

/** Mirrors an Advertise With Us enquiry into sales_leads so the team can work it like any other
 * lead (status, assignee, follow-ups). Budget range and campaign goal get their own columns — only
 * this page collects them — and are also summarised in `query`, which is what the exports' Query
 * column carries. advertise_submissions stays the untouched original; this row is the editable
 * working copy, same as the other page-lead mirrors.
 *
 * Same id as the submission, so `upsertLead` (ON DUPLICATE KEY UPDATE on id) can never create a
 * second lead for it. */
export function submissionToSalesLead(submission: AdvertiseSubmission): SalesLead {
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
    source: 'Advertise With Us',
    type: ADVERTISE_PAGE_LEAD_TYPE,
    otherType: '',
    query: `Budget: ${submission.budgetRange} · Goal: ${submission.campaignGoal}`,
    eventTitle: '',
    eventSlug: '',
    eventDate: '',
    eventTime: '',
    externalUrl: '',
    posterUrl: '',
    description: '',
    budgetRange: submission.budgetRange,
    campaignGoal: submission.campaignGoal,
    tellUsMore: submission.tellUsMore,
    assignedTo: '',
    status: 'Pending',
    nextFollowUpDate: '',
    lastConnectDate: '',
    lastCallDiscussion: '',
  };
}
