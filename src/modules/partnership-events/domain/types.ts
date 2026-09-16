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
  /** Public URL slug for /startup-events/:slug — the record's own copy, no longer only on the linked events row. */
  slug: string | null;
  /** Public visibility — 'draft' | 'upcoming' | 'cancelled' are admin-set; 'completed' is automatic (see markPastAsCompleted). */
  site_status: 'draft' | 'upcoming' | 'completed' | 'cancelled' | null;
  event_name: string;
  city: string | null;
  /** 'own' | 'other' | null — manual override for the /events city section. See
   * CITY_SECTION_OVERRIDE_OPTIONS and the add-partnership-events-city-section-override migration. */
  city_section_override: string | null;
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
  /** Organiser's own social profile links — see SOCIAL_LINK_FIELDS. Set once from /list-your-event. */
  social_instagram: string | null;
  social_linkedin: string | null;
  social_x: string | null;
  social_facebook: string | null;
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
  slug: string;
  siteStatus: 'draft' | 'upcoming' | 'completed' | 'cancelled';
  eventName: string;
  city: string;
  /** '' (auto) | 'own' | 'other' — see CITY_SECTION_OVERRIDE_OPTIONS. Applied city-wide. */
  citySectionOverride: string;
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
  socialInstagram: string;
  socialLinkedin: string;
  socialX: string;
  socialFacebook: string;
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
  citySectionOverride?: string;
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
  /** CREATE-ONLY: written on insert, never on update — see CREATE_ONLY_COLUMNS in the repository. */
  socialInstagram?: string;
  socialLinkedin?: string;
  socialX?: string;
  socialFacebook?: string;
  partnershipStatus?: string;
  partnershipType?: string;
  lastUpdatedDate?: string | null;
  comment?: string;
  listing?: string;
  listingLink?: string;
  source?: string;
  /** Also drives the (still-maintained) linked public Event's country field — see syncLinkedEvent. */
  region?: string;
  /** Public URL slug. Left blank, one is auto-generated from the event name (see
   * PartnershipEventsService's slug generation, mirroring EventsService.createEvent). */
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
/** The real, public-site-facing status — separate from PARTNERSHIP_STATUS_OPTIONS (deal stage) and the existing, unwired `listing` field. No "Completed" here — that's automatic, driven by event date (see PartnershipEventsRepository.markSiteStatusPastAsCompleted). */
export const SITE_STATUS_OPTIONS: { value: 'draft' | 'upcoming' | 'cancelled'; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'upcoming', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
];
// Repurposed from a geography-based Domestic/International split to an event-format split —
// old stored 'Domestic'/'International' values show as "(legacy)" in the dropdown until an
// admin manually reclassifies them.
export const PARTNERSHIP_TYPE_OPTIONS = ['In-person', 'Cohort', 'Online (virtual)'] as const;
/**
 * The one PARTNERSHIP_TYPE_OPTIONS value with no physical location. Single source of truth: the
 * public submit form locks its Country/City selects on it, and EventSubmissionService drops the
 * city / venue / maps-link requirements for it — those two must never drift apart, or the form
 * lets a submission through that the API then rejects with a 400.
 */
export const ONLINE_PARTNERSHIP_TYPE: string = 'Online (virtual)';
/**
 * Unlike Online, a Cohort event keeps its real country and city (they're stored and shown on its
 * card) — but /events lists every Cohort event under ONE "Cohort" heading, never under its
 * country or a city sub-heading. The same string is the section name (and the seeded
 * `event_regions` row), so getEventsByRegion keys these events by it directly.
 */
export const COHORT_PARTNERSHIP_TYPE: string = 'Cohort';
/**
 * Display label for an online event's location. DERIVED AT RENDER TIME, never stored: an online
 * event has no country and no city, so both columns stay genuinely blank and
 * partnershipEntityToStartupEvent falls back to this label off `partnership_type`.
 *
 * It has to be this exact string because the public pages already treat "Online" as a real,
 * non-geographic region: /events lists it in NON_GEOGRAPHIC_REGIONS so it keeps its own section
 * instead of being grouped under a country, and canonicalCountryName passes it through untouched.
 * Deriving rather than storing matters because /events keys its region buckets off `location`
 * (data-adapter's getEventsByRegion) — a blank location would land every online event in an
 * unnamed "" bucket and render a section with no heading.
 */
export const ONLINE_LOCATION_LABEL = 'Online';
export const LISTING_OPTIONS = ['No', 'Pending', 'In process', 'Yes'] as const;
/**
 * Manual override for which /events section a city renders under, stored in `city_section_override`.
 * '' means auto — the normal rule decides, which is AUTO_SECTION_MIN_EVENTS listed events and
 * nothing else (curation stopped exempting a city; see citySectionQualifies).
 * Applied CITY-WIDE: read off any event of the city, so a city is never split across two sections.
 */
export const CITY_SECTION_OVERRIDE_OPTIONS = [
  { value: '', label: 'Auto — decide from the rules' },
  { value: 'own', label: 'Always its own city section' },
  { value: 'other', label: 'Always under "Other Cities"' },
] as const;
/** Stored in the `eventType`/`event_type` field — repurposed from the old Free/Paid ticketing dropdown. */
export const PARTNERSHIP_KIND_OPTIONS = ['Media Partnership', 'Ticketing Partnership', 'No Partnership'] as const;
export const SOCIAL_CREATIVE_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'whatsapp'] as const;
export const SOCIAL_CREATIVE_PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', other: 'Other (from before)',
};

/**
 * The organiser's own social profile links, asked for (all optional) on /list-your-event step 4.
 * `key` is the field name on PartnershipEvent / PartnershipEventInput / the submit payload, so the
 * form, the API and the admin tracker all iterate this one list. `hosts` is what a link must point
 * at — a subdomain of one of them also passes (www., m., in.linkedin.com …).
 *
 * Read-only in the admin tracker: these are the organiser's own answers, stored once on create and
 * never overwritten by an admin save (the repository's update path does not know these columns).
 */
export const SOCIAL_LINK_FIELDS = [
  { key: 'socialInstagram', label: 'Instagram', placeholder: 'https://instagram.com/yourpage', hosts: ['instagram.com'] },
  { key: 'socialLinkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourpage', hosts: ['linkedin.com'] },
  { key: 'socialX', label: 'X (Twitter)', placeholder: 'https://x.com/yourhandle', hosts: ['x.com', 'twitter.com'] },
  { key: 'socialFacebook', label: 'Facebook', placeholder: 'https://facebook.com/yourpage', hosts: ['facebook.com', 'fb.com', 'fb.me'] },
] as const;
export type SocialLinkKey = (typeof SOCIAL_LINK_FIELDS)[number]['key'];
export const SOCIAL_LINK_MAX_LENGTH = 500;

/** Adds https:// to a link typed without a scheme ("instagram.com/acme"), so what is validated and
 * stored is a clickable URL. Blank stays blank. */
export function normalizeSocialLink(value: string | null | undefined): string {
  const v = (value || '').trim();
  if (!v) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
}

/** '' when the link is blank (every field is optional) or valid; otherwise the message to show.
 * Shared by the form and EventSubmissionService so the two can never disagree. */
export function socialLinkError(key: SocialLinkKey, value: string | null | undefined): string {
  const field = SOCIAL_LINK_FIELDS.find((f) => f.key === key)!;
  const link = normalizeSocialLink(value);
  if (!link) return '';
  const invalid = `Enter a valid ${field.label} link (e.g. ${field.placeholder}).`;
  if (link.length > SOCIAL_LINK_MAX_LENGTH) return `${field.label} link is too long.`;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return invalid;
  }
  if (!/^https?:$/.test(url.protocol)) return invalid;
  const host = url.hostname.toLowerCase();
  const hostMatches = (field.hosts as readonly string[]).some((h) => host === h || host.endsWith(`.${h}`));
  return hostMatches ? '' : invalid;
}

/** Guidance shown next to each upload/text field in the Add/Edit modal. */
export const EVENT_DESCRIPTION_MIN_LENGTH = 150;
export const POSTER_SPEC = '1260×630px, JPG, PNG or WebP, under 2MB — used on the event listing page.';
export const BANNER_SPEC = '2438×413px, JPG, PNG or WebP, under 2MB — used on the homepage.';
export const SOCIAL_CREATIVE_SPEC = '1080×1440px, JPG, PNG or WebP.';
