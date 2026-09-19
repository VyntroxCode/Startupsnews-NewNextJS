/** Where the sales team's conversation with an /expand-north-star enquiry stands — the "Lead
 * status" dropdown in the Sales Tracker's edit dialog for these enquiries.
 *
 * One list for both sides, as with participation.ts: the dialog renders these options and the admin
 * API only accepts these values. Plain data with no server imports, so the client card imports it.
 *
 * Every enquiry starts with no status at all (null) — "no conversation yet". Only "followed-up"
 * carries a conversation note: what the last conversation with the lead led to. */
export const LEAD_STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'followed-up', label: 'Followed Up' },
  { value: 'cancelled', label: 'Cancelled' },
] as const satisfies readonly { value: string; label: string }[];

export type EnsLeadStatus = (typeof LEAD_STATUS_OPTIONS)[number]['value'];

/** The one status that asks the admin to write down how the conversation went. */
export const LEAD_STATUS_FOLLOWED_UP: EnsLeadStatus = 'followed-up';

/** Longest conversation note accepted under "Followed Up". */
export const CONVERSATION_NOTE_MAX_LENGTH = 2000;

/** What the table and the detail view show for an enquiry nobody has spoken to yet. */
export const NO_STATUS_LABEL = 'No conversation yet';

export function isLeadStatus(value: string): value is EnsLeadStatus {
  return LEAD_STATUS_OPTIONS.some((option) => option.value === value);
}

export function leadStatusLabel(value: string | null): string {
  if (!value) return NO_STATUS_LABEL;
  return LEAD_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
