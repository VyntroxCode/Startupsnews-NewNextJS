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
 * modules/press-release-submissions/service/to-sales-lead.ts,
 * modules/sponsor-event-submissions/service/to-sales-lead.ts and
 * modules/advertise-submissions/service/to-sales-lead.ts), filtered separately from TYPES
 * above via their own "Filter: page leads" dropdown in LeadsTable — they aren't a channel a team
 * member picks when adding a lead by hand, so they don't belong in the general Filter: type list
 * or the manual "Type of lead" selector. More get appended here as more public forms get wired up
 * the same way. */
export const PAGE_LEAD_TYPES = ['Feature Page Leads', 'Funding Round Page Leads', 'Press Release Page Leads', 'Sponsor Event Page Leads', 'Advertise Page Leads'] as const;

/** The page leads whose public form ends with the optional "Tell us more" box — every page lead
 * except Sponsor an Event (its own event Description covers it). The lead window shows the box's
 * text read-only for these, see LeadFormModal. */
export const TELL_US_MORE_LEAD_TYPES: readonly string[] = ['Feature Page Leads', 'Funding Round Page Leads', 'Press Release Page Leads', 'Advertise Page Leads'];

/** Expand North Star enquiries still live only in ens_travel_enquiries (never mirrored into
 * sales_leads — see scripts/migrations/remove-ens-mirrored-sales-leads.sql for why), but the
 * unified "All leads" table now joins them in at the display layer as read-only rows tagged with
 * this synthetic type label, alongside PAGE_LEAD_TYPES. Editing one still opens
 * EnsEnquiryDetailModal and saves through its own endpoint, not the generic lead editor. */
export const ENS_ENQUIRY_TYPE_LABEL = 'Expand North Star Enquiry';
/** Every "where did this lead come from" page, in display order — the "Filter: page leads"
 * dropdown in LeadsTable and the Leads overview type rows and the clickable tiles in PageLeadsKpis all read this one list. */
export const PAGE_LEAD_FILTER_OPTIONS: readonly string[] = [...PAGE_LEAD_TYPES, ENS_ENQUIRY_TYPE_LABEL];

/** Short names for the Leads by page tiles (PageLeadsKpis), the Leads overview and the All leads banner — the public page each lead type comes from. */
export const PAGE_LEAD_LABELS: Record<string, string> = {
  'Feature Page Leads': 'Feature Your Startup',
  'Funding Round Page Leads': 'Funding Round',
  'Press Release Page Leads': 'Press Release',
  'Sponsor Event Page Leads': 'Sponsor an Event',
  'Advertise Page Leads': 'Advertise With Us',
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

/** Layout of the lead window's fields (LeadFormModal, EnsEnquiryDetailModal): one grid that every
 * field flows through — 4 per row from 1200px, 2 from 560px, 1 below. `.row` / `.field-row`
 * wrappers rendered by shared pieces (LeadAssignmentFields, CountryCityFields) are flattened with
 * `contents` so their fields take a column each; anything full-width uses `col-span-full`.
 * Labels stay on one line (the lock note truncates, full text in its tooltip) so inputs line up,
 * and the phone code picker narrows so the number still fits a quarter-width column. A
 * non-searchable CustomSelect (City) renders a real <button>, which the page's generic button rule
 * would otherwise centre and embolden — the `button.custom-select-btn` utilities put it back in
 * line with the other inputs. The `!`s are there because the page's styled-jsx rules
 * (`.sales-tracker-page .field`, `button:not(.tw)` …) outrank a utility. */
export const LEAD_FORM_GRID =
  'grid grid-cols-1 min-[560px]:grid-cols-2 min-[1200px]:grid-cols-4 items-start gap-4 mb-4 ' +
  '[&>.row]:contents! [&>.field-row]:contents! [&_.field]:min-w-0! ' +
  '[&_label]:truncate! [&_.lock-hint]:inline! [&_.lock-hint>svg]:inline [&_.lock-hint>svg]:mr-1 ' +
  '[&_.phone-row_.custom-select-wrap]:w-[104px]! [&_.phone-row_.custom-select-wrap]:basis-[104px]! ' +
  '[&_.phone-row_input[type=tel]]:min-w-0! ' +
  '[&_button.custom-select-btn]:flex! [&_button.custom-select-btn]:justify-between! [&_button.custom-select-btn]:h-10! ' +
  '[&_button.custom-select-btn]:px-3! [&_button.custom-select-btn]:text-sm! [&_button.custom-select-btn]:font-normal!';
