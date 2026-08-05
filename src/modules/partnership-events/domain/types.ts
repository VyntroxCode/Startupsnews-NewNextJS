export interface Speaker {
  name: string;
  designation: string;
  company: string;
}

// JSON columns: the `mariadb` driver auto-parses these into arrays, but the raw
// mysql JSON type is untyped from our side, so we accept either shape defensively.
type JsonArrayColumn = unknown[] | string | null;

export interface PartnershipEventEntity {
  id: number;
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
  socialCreatives: string[];
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
  socialCreatives?: string[];
  partnershipStatus?: string;
  partnershipType?: string;
  lastUpdatedDate?: string | null;
  comment?: string;
  listing?: string;
  listingLink?: string;
  source?: string;
}

export interface PartnershipEventFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const PARTNERSHIP_STATUS_OPTIONS = ['Initiated', 'In Progress', 'On Hold', 'Partnership Done', 'Dropped', 'Only Listed (No Partnership)', 'Expired'] as const;
export const PARTNERSHIP_TYPE_OPTIONS = ['Domestic', 'International'] as const;
export const LISTING_OPTIONS = ['No', 'Pending', 'In process', 'Yes'] as const;
export const EVENT_TICKET_TYPE_OPTIONS = ['Free', 'Paid'] as const;
export const CURRENCY_OPTIONS = ['INR', 'USD', 'AED', 'GBP', 'EUR', 'SGD'] as const;

/** Guidance shown next to each upload/text field in the Add/Edit modal. */
export const EVENT_DESCRIPTION_MIN_LENGTH = 150;
export const POSTER_SPEC = 'Portrait, 1080×1350px (4:5), JPG or PNG, under 2MB — used on the event listing page.';
export const BANNER_SPEC = 'Landscape, 1920×600px, JPG, PNG or WebP, under 2MB — used on the homepage.';
export const SOCIAL_CREATIVE_SPEC = 'HD, 1080×1080px (square) or 1080×1920px (story), JPG or PNG.';
