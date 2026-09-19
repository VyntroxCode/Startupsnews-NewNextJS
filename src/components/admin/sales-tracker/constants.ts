export const TYPES = ['Social Media', 'Events', 'PR-National', 'PR-International', 'Others'] as const;

/** Leads mirrored in automatically from a public site form (see
 * modules/feature-startup-submissions/service/to-sales-lead.ts,
 * modules/funding-round-submissions/service/to-sales-lead.ts and
 * modules/press-release-submissions/service/to-sales-lead.ts and
 * modules/sponsor-event-submissions/service/to-sales-lead.ts), filtered separately from TYPES
 * above via their own "Filter: page leads" dropdown in LeadsTable — they aren't a channel a team
 * member picks when adding a lead by hand, so they don't belong in the general Filter: type list
 * or the manual "Type of lead" selector. More get appended here as more public forms get wired up
 * the same way. Expand North Star enquiries are deliberately NOT here: they live only in their own
 * card (EnsEnquiriesCard) and never in sales_leads. */
export const PAGE_LEAD_TYPES = ['Feature Page Leads', 'Funding Round Page Leads', 'Press Release Page Leads', 'Sponsor Event Page Leads'] as const;
export const STATUSES = [
  'Query received', 'Initiated', 'Under discussion', 'On hold', 'Dropped',
  'No response', 'Will reach when needed', 'Successfully closed',
] as const;
export const STATUS_COLORS: Record<string, [string, string]> = {
  'Query received': ['#EFF6FF', '#1D4ED8'], Initiated: ['#E9F7EE', '#1F7A3F'],
  'Under discussion': ['#FFF3D6', '#8A5A00'], 'On hold': ['#F1EFE8', '#5F5E5A'],
  Dropped: ['#FCE4E4', '#B3231F'], 'No response': ['#FCE4E4', '#B3231F'],
  'Will reach when needed': ['#FFF3D6', '#8A5A00'], 'Successfully closed': ['#E9F7EE', '#1F7A3F'],
};
export const SUMMARY_STATUSES = ['Initiated', 'In progress', 'Successfully closed', 'Dropped'];
export const STATUS_TO_SUMMARY: Record<string, string> = {
  'Query received': 'In progress', Initiated: 'Initiated', 'Under discussion': 'In progress',
  'On hold': 'In progress', Dropped: 'Dropped', 'No response': 'In progress',
  'Will reach when needed': 'In progress', 'Successfully closed': 'Successfully closed',
};
