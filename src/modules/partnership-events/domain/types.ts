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
  siteStatus?: 'draft' | 'upcoming' | 'cancelled';
}

export interface PartnershipEventFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const PARTNERSHIP_STATUS_OPTIONS = ['Draft', 'Initiated', 'In Progress', 'On Hold', 'Partnership Done', 'Dropped', 'Only Listed (No Partnership)', 'Expired'] as const;
/** The real, public-site-facing status — separate from PARTNERSHIP_STATUS_OPTIONS (deal stage) and the existing, unwired `listing` field. No "Completed" here — that's automatic, driven by event date (see EventsRepository.markPastEventsAsExpired). */
export const SITE_STATUS_OPTIONS: { value: 'draft' | 'upcoming' | 'cancelled'; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'upcoming', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
];
export const PARTNERSHIP_TYPE_OPTIONS = ['Domestic', 'International'] as const;
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
