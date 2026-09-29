/** Where the sales team's conversation with an /expand-north-star enquiry stands — the "Lead
 * status" dropdown in the Sales Tracker's edit dialog for these enquiries.
 *
 * One list for both sides, as with participation.ts: the dialog renders these options and the admin
 * API only accepts these values. Plain data with no server imports, so the client card imports it.
 *
 * Every enquiry starts with no status at all (null) — "no conversation yet". "confirmed" and
 * "followed-up" carry a conversation note: what the last conversation with the lead led to.
 * The stored values predate the current labels ("Follow Up", "Not Interested") and are kept as-is
 * so existing rows need no migration. Together with "no status" (shown as Pending) these are exactly
 * the four shared lead statuses (lead-assignments/domain/types.ts ASSIGNMENT_STATUS_OPTIONS, which
 * maps to these codes) — an employee's follow-up on My Leads writes them too. */
export const LEAD_STATUS_OPTIONS = [
  { value: 'followed-up', label: 'Follow Up' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Not Interested' },
] as const satisfies readonly { value: string; label: string }[];

export type EnsLeadStatus = (typeof LEAD_STATUS_OPTIONS)[number]['value'];

/** The statuses that ask the admin to write down how the conversation went. */
export const LEAD_STATUSES_WITH_NOTE: readonly EnsLeadStatus[] = ['confirmed', 'followed-up'];

export function leadStatusTakesNote(value: string | null): boolean {
  return !!value && (LEAD_STATUSES_WITH_NOTE as readonly string[]).includes(value);
}

/** Longest conversation note accepted under "Confirmed" / "Follow Up". */
export const CONVERSATION_NOTE_MAX_LENGTH = 2000;

/** What the table and the detail view show for an enquiry with no status yet — the shared "Pending". */
export const NO_STATUS_LABEL = 'Pending';

export function isLeadStatus(value: string): value is EnsLeadStatus {
  return LEAD_STATUS_OPTIONS.some((option) => option.value === value);
}

export function leadStatusLabel(value: string | null): string {
  if (!value) return NO_STATUS_LABEL;
  return LEAD_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
