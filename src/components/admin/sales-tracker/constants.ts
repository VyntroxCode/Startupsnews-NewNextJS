import {
  ASSIGNMENT_STATUS_COLORS,
  ASSIGNMENT_STATUS_OPTIONS,
  FINISHED_LEAD_STATUSES,
  SALES_LEAD_STATUS_LABELS,
  statusFromSalesLead,
} from '@/modules/lead-assignments/domain/types';

export const TYPES = ['Social Media', 'Events', 'PR-National', 'PR-International', 'Others'] as const;

/** Leads mirrored in automatically from a public site form (see
 * modules/feature-startup-submissions/service/to-sales-lead.ts,
 * modules/funding-round-submissions/service/to-sales-lead.ts and
 * modules/press-release-submissions/service/to-sales-lead.ts and
 * modules/sponsor-event-submissions/service/to-sales-lead.ts), filtered separately from TYPES
 * above via their own "Filter: page leads" dropdown in LeadsTable — they aren't a channel a team
 * member picks when adding a lead by hand, so they don't belong in the general Filter: type list
 * or the manual "Type of lead" selector. More get appended here as more public forms get wired up
 * the same way. */
export const PAGE_LEAD_TYPES = ['Feature Page Leads', 'Funding Round Page Leads', 'Press Release Page Leads', 'Sponsor Event Page Leads'] as const;

/** Expand North Star enquiries still live only in ens_travel_enquiries (never mirrored into
 * sales_leads — see scripts/migrations/remove-ens-mirrored-sales-leads.sql for why), but the
 * unified "All leads" table now joins them in at the display layer as read-only rows tagged with
 * this synthetic type label, alongside PAGE_LEAD_TYPES. Editing one still opens
 * EnsEnquiryDetailModal and saves through its own endpoint, not the generic lead editor. */
export const ENS_ENQUIRY_TYPE_LABEL = 'Expand North Star Enquiry';
/** Every "where did this lead come from" page, in display order — the "Filter: page leads"
 * dropdown in LeadsTable and the clickable tiles in PageLeadsKpis both read this one list. */
export const PAGE_LEAD_FILTER_OPTIONS: readonly string[] = [...PAGE_LEAD_TYPES, ENS_ENQUIRY_TYPE_LABEL];

/** Short tile titles for PageLeadsKpis — the public page each lead type comes from. */
export const PAGE_LEAD_LABELS: Record<string, string> = {
  'Feature Page Leads': 'Feature Your Startup',
  'Funding Round Page Leads': 'Funding Round',
  'Press Release Page Leads': 'Press Release',
  'Sponsor Event Page Leads': 'Sponsor an Event',
  [ENS_ENQUIRY_TYPE_LABEL]: 'Expand North Star',
};
/** The four lead statuses, shared with the employee My Leads page — one list, defined in
 * lead-assignments/domain/types.ts (ASSIGNMENT_STATUS_OPTIONS). sales_leads.status stores these
 * labels. Before 2026-09-29 there were eight ("Query received" … "Successfully closed"); every lead
 * was reset to Pending by scripts/migrations/unify-sales-lead-status.sql. */
export const STATUSES = SALES_LEAD_STATUS_LABELS;
/** [background, text] per label, from the shared per-value colours. */
export const STATUS_COLORS: Record<string, [string, string]> = Object.fromEntries(
  ASSIGNMENT_STATUS_OPTIONS.map((o) => [o.label, ASSIGNMENT_STATUS_COLORS[o.value]])
);
/** Still being worked (not Confirmed / Not Interested). */
export function isOpenStatusLabel(label: string): boolean {
  return !(FINISHED_LEAD_STATUSES as readonly string[]).includes(statusFromSalesLead(label));
}
