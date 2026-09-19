import type { ParticipationValue } from './participation';
import type { EnsLeadStatus } from './lead-status';
import type { FoundUsValue, ReferredByValue } from './sources';

/** A travel enquiry from the closing form on /expand-north-star, as the public route, the admin
 * Sales Tracker card and its detail view all see it. Type-only (plus the error class) on purpose —
 * the admin client components import this file directly. */
export interface EnsTravelEnquiry {
  id: string;
  name: string;
  email: string;
  /** Composed in the browser as "+971 501234567" — dial code and number, one string. */
  contact: string;
  city: string;
  country: string;
  /** Which package they're asking about — see participation.ts. */
  participation: ParticipationValue;
  /** Their own description of what they need. Only collected, and required, under "Others";
   * empty for every other option. */
  requirement: string;
  /** The partner organisation that referred them — see sources.ts. "" when none was named. */
  referredBy: ReferredByValue | '';
  /** The channel they found the event through — see sources.ts. */
  foundUs: FoundUsValue;
  /** Their own words, only collected (and required) when `foundUs` is "others"; empty otherwise. */
  foundUsDetail: string;
  /** Where the team's conversation with this lead stands — see lead-status.ts. Null until an admin
   * sets one in the Sales Tracker: "no conversation yet". */
  leadStatus: EnsLeadStatus | null;
  /** What the last conversation led to. Only kept while `leadStatus` is "followed-up"; empty
   * otherwise. */
  conversationNote: string;
  /** When the visitor submitted, as the DB returns it ("2026-09-17 11:30:00", IST pool timezone). */
  createdAt: string;
  /** When an admin last edited it in the Sales Tracker; null if never edited. */
  updatedAt: string | null;
  /** Name of the admin who made that last edit; empty if never edited. */
  updatedBy: string;
}

/** The fields a visitor submits and an admin may edit. */
export type EnsTravelEnquiryInput = Pick<
  EnsTravelEnquiry,
  'name' | 'email' | 'contact' | 'city' | 'country' | 'participation' | 'requirement' | 'referredBy' | 'foundUs' | 'foundUsDetail'
>;

/** What an admin saves from the Sales Tracker's edit dialog: the visitor's fields plus the team's
 * own conversation record, which the public form never sends. */
export type EnsTravelEnquiryAdminInput = EnsTravelEnquiryInput & Pick<EnsTravelEnquiry, 'leadStatus' | 'conversationNote'>;

export interface EnsTravelEnquiryEntity {
  id: string;
  name: string;
  email: string;
  contact: string;
  city: string;
  country: string;
  participation: string;
  requirement: string | null;
  referred_by: string | null;
  found_us: string | null;
  found_us_detail: string | null;
  lead_status: string | null;
  conversation_note: string | null;
  created_at: string | Date;
  updated_at: string | Date | null;
  updated_by: string | null;
}

/** Thrown for anything the visitor (or admin) can fix, so the route can answer 400 with the message
 * rather than 500 with a shrug. Mirrors the other submission modules' validation errors. */
export class EnsTravelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnsTravelValidationError';
  }
}
