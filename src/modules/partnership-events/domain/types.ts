export interface Speaker {
  name: string;
  designation: string;
  company: string;
  others: string;
}

/** platform is one of SOCIAL_CREATIVE_PLATFORMS, or 'other' for legacy pre-grouping uploads. */
export interface SocialCreative {
  platform: string;
  image: string;
}

// JSON columns: the `mariadb` driver auto-parses these into arrays, but the raw
// mysql JSON type is untyped from our side, so we accept either shape defensively.
type JsonArrayColumn = unknown[] | string | null;

/** Summary of the auto-managed public Event linked to a partnership record (from the `events` table, read live — never duplicated). */
export interface LinkedEventSummary {
  id: number;
  slug: string;
  status: 'draft' | 'upcoming' | 'completed' | 'cancelled';
  location: string;
  country: string | null;
  /** Fallback source for the Edit modal's Description/Event Date/Event Time/Registration Link
   * fields — for an event originally created straight on the Events tab (not through this
   * tracker), the partnership_events row's own columns are often blank while the real data lives
   * here. Only used when the partnership_events row's own field is blank (openEditModal) — never
   * overrides a value the admin already has on the tracker side. */
  description: string | null;
  eventDate: string | null;
  eventTime: string | null;
  externalUrl: string | null;
}

export interface PartnershipEventEntity {
  id: number;
  event_id: number | null;
  event_name: string;
  city: string | null;
  country: string | null;
  organiser: string | null;
  poc: string | null;
  contact: string | null;
  email: string | null;
  website: string | null;
  email_thread: string | null;
  initiated_date: string | null;
  event_start_date: string | null;
  event_start_time: string | null;
  event_end_date: string | null;
  event_end_time: string | null;
  venue_address: string | null;
  google_location_link: string | null;
  description: string | null;
  event_type: string | null;
  ticket_currency: string | null;
  ticket_price: string | null;
  speakers: JsonArrayColumn;
  poster_url: string | null;
  banner_url: string | null;
  /** Date the homepage banner should go live — see PartnershipEventsService.syncHomepageBanner. */
  banner_start_date: string | null;
  /** id of the auto-managed `banners` row created from banner_url, so re-saving updates it in place. */
  banner_id: number | null;
  /** Admin's explicit on/off switch for the homepage banner. TINYINT(1); NULL only on rows that
   * predate the column. See PartnershipEventsService.syncHomepageBanner. */
  banner_active: number | boolean | null;
  social_media_posts: string | null;
  social_creatives: JsonArrayColumn;
  partnership_status: string | null;
  partnership_type: string | null;
  last_updated_date: string | null;
  comment: string | null;
  listing: string | null;
  listing_link: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface PartnershipEvent {
  id: number;
  eventId: number | null;
  eventName: string;
  city: string;
  country: string;
  organiser: string;
  poc: string;
  contact: string;
  email: string;
  website: string;
  emailThread: string;
  initiatedDate: string;
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  venueAddress: string;
  googleLocationLink: string;
  description: string;
  eventType: string;
  ticketCurrency: string;
  ticketPrice: string;
  speakers: Speaker[];
  posterUrl: string;
  bannerUrl: string;
  bannerStartDate: string;
  /** False takes the banner off the homepage without discarding the image or its start date. */
  bannerActive: boolean;
  socialMediaPosts: string;
  socialCreatives: SocialCreative[];
  partnershipStatus: string;
  partnershipType: string;
  lastUpdatedDate: string;
  comment: string;
  listing: string;
  listingLink: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PartnershipEventInput {
  eventName: string;
  city?: string;
  country?: string;
  organiser?: string;
  poc?: string;
  contact?: string;
  email?: string;
  website?: string;
  emailThread?: string;
  initiatedDate?: string | null;
  eventStartDate?: string | null;
  eventStartTime?: string;
  eventEndDate?: string | null;
  eventEndTime?: string;
  venueAddress?: string;
  googleLocationLink?: string;
  description?: string;
  eventType?: string;
  ticketCurrency?: string;
  ticketPrice?: string;
  speakers?: Speaker[];
  posterUrl?: string;
  bannerUrl?: string;
  /** YYYY-MM-DD. Required by the admin form whenever bannerUrl is set — nothing reaches the homepage without it. */
  bannerStartDate?: string | null;
  /** Explicit show/hide for the homepage banner. Omitted by callers that don't manage banners. */
  bannerActive?: boolean;
  socialMediaPosts?: string;
  socialCreatives?: SocialCreative[];
  partnershipStatus?: string;
  partnershipType?: string;
  lastUpdatedDate?: string | null;
  comment?: string;
  listing?: string;
  listingLink?: string;
  source?: string;
  /** Drives the linked public Event — not a partnership_events column, consumed by the create/update sync. */
  region?: string;
  /** Drives the linked public Event's URL slug — not a partnership_events column. Left blank, the
   * linked Event falls back to auto-generating one from the event name (see EventsService.createEvent). */
  slug?: string;
  siteStatus?: 'draft' | 'upcoming' | 'cancelled';
}

export interface PartnershipEventFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// 'In Progress' / 'On Hold' / 'Dropped' were retired from this list — any event still carrying
// that stored text buckets to 'Unmapped' (classifyStatus in partnership-tracker/page.tsx) for the
// admin to manually reclassify, it's not auto-migrated.
// 'Only Listed (No Partnership)' was retired too, but it's an exact synonym of 'Only Listing'
// rather than a dropped concept, so its rows were rewritten in place by
// scripts/migrate-only-listed-to-only-listing.ts.
export const PARTNERSHIP_STATUS_OPTIONS = ['Draft', 'Initiated', 'Partnership Done', 'Only Listing', 'Ticketing', 'Cancelled', 'Expired'] as const;
/** The real, public-site-facing status — separate from PARTNERSHIP_STATUS_OPTIONS (deal stage) and the existing, unwired `listing` field. No "Completed" here — that's automatic, driven by event date (see EventsRepository.markPastEventsAsExpired). */
export const SITE_STATUS_OPTIONS: { value: 'draft' | 'upcoming' | 'cancelled'; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'upcoming', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
];
// Repurposed from a geography-based Domestic/International split to an event-format split —
// old stored 'Domestic'/'International' values show as "(legacy)" in the dropdown until an
// admin manually reclassifies them.
export const PARTNERSHIP_TYPE_OPTIONS = ['In-person', 'Cohort', 'Online (virtual)'] as const;
export const LISTING_OPTIONS = ['No', 'Pending', 'In process', 'Yes'] as const;
/** Stored in the `eventType`/`event_type` field — repurposed from the old Free/Paid ticketing dropdown. */
export const PARTNERSHIP_KIND_OPTIONS = ['Media Partnership', 'Ticketing Partnership', 'No Partnership'] as const;
export const SOCIAL_CREATIVE_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'whatsapp'] as const;
export const SOCIAL_CREATIVE_PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', other: 'Other (from before)',
};

/** Guidance shown next to each upload/text field in the Add/Edit modal. */
export const EVENT_DESCRIPTION_MIN_LENGTH = 150;
export const POSTER_SPEC = '1260×630px, JPG or PNG, under 2MB — used on the event listing page.';
export const BANNER_SPEC = '2438×413px, JPG, PNG or WebP, under 2MB — used on the homepage.';
export const SOCIAL_CREATIVE_SPEC = '1080×1440px, JPG or PNG.';
