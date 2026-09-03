import { PartnershipEvent, PartnershipEventEntity, Speaker, SocialCreative, SOCIAL_CREATIVE_PLATFORMS, PARTNERSHIP_STATUS_OPTIONS } from '../domain/types';

function parseJsonArray(value: unknown): unknown[] {
  if (!value) return [];
  // The `mariadb` driver may return JSON columns as an already-parsed array, a raw
  // JSON string, or a Buffer (when the connection isn't in string mode) — handle all three.
  let parsed: unknown = value;
  if (Buffer.isBuffer(value)) parsed = safeJsonParse(value.toString('utf8'));
  else if (typeof value === 'string') parsed = safeJsonParse(value);
  return Array.isArray(parsed) ? parsed : [];
}
function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
export function parseSpeakers(value: unknown): Speaker[] {
  return parseJsonArray(value)
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      name: typeof v.name === 'string' ? v.name : '',
      designation: typeof v.designation === 'string' ? v.designation : '',
      company: typeof v.company === 'string' ? v.company : '',
      others: typeof v.others === 'string' ? v.others : '',
    }))
    .filter((s) => s.name.trim().length > 0);
}
// Legacy rows stored a flat array of image URL strings (no platform grouping); bucket those
// under 'other' so they still surface in the edit modal instead of silently disappearing.
function parseSocialCreatives(value: unknown): SocialCreative[] {
  const result: SocialCreative[] = [];
  for (const item of parseJsonArray(value)) {
    if (typeof item === 'string' && item.trim()) {
      result.push({ platform: 'other', image: item.trim() });
      continue;
    }
    if (item && typeof item === 'object' && typeof (item as Record<string, unknown>).image === 'string') {
      const rec = item as Record<string, unknown>;
      const platform = typeof rec.platform === 'string' && (SOCIAL_CREATIVE_PLATFORMS as readonly string[]).includes(rec.platform) ? rec.platform : 'other';
      if ((rec.image as string).trim()) result.push({ platform, image: rec.image as string });
    }
  }
  return result;
}

export function entityToPartnershipEvent(entity: PartnershipEventEntity): PartnershipEvent {
  return {
    id: entity.id,
    eventId: entity.event_id ?? null,
    slug: entity.slug || '',
    siteStatus: entity.site_status || 'draft',
    eventName: entity.event_name || '',
    city: entity.city || '',
    country: entity.country || '',
    organiser: entity.organiser || '',
    poc: entity.poc || '',
    contact: entity.contact || '',
    email: entity.email || '',
    website: entity.website || '',
    emailThread: entity.email_thread || '',
    initiatedDate: entity.initiated_date || '',
    eventStartDate: entity.event_start_date || '',
    eventStartTime: entity.event_start_time || '',
    eventEndDate: entity.event_end_date || '',
    eventEndTime: entity.event_end_time || '',
    venueAddress: entity.venue_address || '',
    googleLocationLink: entity.google_location_link || '',
    description: entity.description || '',
    eventType: entity.event_type || '',
    ticketCurrency: entity.ticket_currency || '',
    ticketPrice: entity.ticket_price || '',
    speakers: parseSpeakers(entity.speakers),
    posterUrl: entity.poster_url || '',
    bannerUrl: entity.banner_url || '',
    bannerStartDate: entity.banner_start_date || '',
    // NULL means the row predates the banner_active column — those banners were live under the
    // old always-on behaviour, so they stay live rather than silently switching themselves off.
    bannerActive: entity.banner_active === null || entity.banner_active === undefined ? true : Boolean(Number(entity.banner_active)),
    socialMediaPosts: entity.social_media_posts || '',
    socialCreatives: parseSocialCreatives(entity.social_creatives),
    partnershipStatus: entity.partnership_status || '',
    partnershipType: entity.partnership_type || '',
    lastUpdatedDate: entity.last_updated_date || '',
    comment: entity.comment || '',
    listing: entity.listing || '',
    listingLink: entity.listing_link || '',
    source: entity.source || '',
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
    createdBy: entity.created_by || '',
    updatedBy: entity.updated_by || '',
  };
}

export const STANDARD_HEADERS = [
  'Name of the event', 'City', 'Country', 'Organiser/Company Name', 'POC - Name',
  'Contact No.', 'Email ID', 'Website Link', 'Email Thread', 'Initiated date', 'Event Start Date',
  'Event End Date', 'Partnership Status', 'Partnership Type (Domestic or International)',
  'Last Updated Date', 'comment', 'Listing (Yes/In process/No)', 'Listing link (if yes)',
] as const;

export function partnershipEventToExportRow(e: PartnershipEvent): Record<(typeof STANDARD_HEADERS)[number], string> {
  return {
    'Name of the event': e.eventName,
    City: e.city,
    Country: e.country,
    'Organiser/Company Name': e.organiser,
    'POC - Name': e.poc,
    'Contact No.': e.contact,
    'Email ID': e.email,
    'Website Link': e.website,
    'Email Thread': e.emailThread,
    'Initiated date': e.initiatedDate,
    'Event Start Date': e.eventStartDate,
    'Event End Date': e.eventEndDate,
    'Partnership Status': e.partnershipStatus,
    'Partnership Type (Domestic or International)': e.partnershipType,
    'Last Updated Date': e.lastUpdatedDate,
    comment: e.comment,
    'Listing (Yes/In process/No)': e.listing,
    'Listing link (if yes)': e.listingLink,
  };
}

/** Short plain-text excerpt for the linked Event, derived from the partnership record's description (Events has its own excerpt field; Partnership Tracker doesn't, so this avoids asking for it twice). */
export function autoExcerpt(description: string | null | undefined, maxLength = 200): string | undefined {
  if (!description) return undefined;
  const text = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

/** Same identity rule as the original standalone tool: name + city + country + start date. */
export function dedupKey(e: { eventName: string; city?: string | null; country?: string | null; eventStartDate?: string | null }): string | null {
  const city = (e.city || '').trim().toLowerCase();
  const country = (e.country || '').trim().toLowerCase();
  const start = (e.eventStartDate || '').trim();
  if (!city && !country && !start) return null;
  return [(e.eventName || '').trim().toLowerCase(), city, country, start].join('|');
}

/* ============================================================
   STATUS CLASSIFICATION
   Shared by the Partnership Tracker screen and /api/admin/stats.
   These moved here out of the tracker page so the dashboard's
   "Events" card and the tracker's own "All Active events" card
   are computed by the same code and can never drift apart.
   ============================================================ */

/** Buckets excluded from the tracker's default table view AND from every "active" count —
 * they need a deliberate, manual look rather than sitting in the everyday list. */
export const DEFAULT_HIDDEN_STATUSES = ['Unmapped', 'Expired'];

/**
 * `siteStatus` is the record's own persisted public status ('draft'/'upcoming'/'completed'),
 * i.e. what the Add/Edit modal's "Website Listing Status *" field controls — pass `e.siteStatus`.
 *
 * "Draft" is bucketed purely from this — NOT from a blank/unset Partnership Status — since
 * whether an event is actually live on the public site is ground truth, while the Partnership
 * Status dropdown is just the internal CRM deal-stage (Initiated/Partnership Done/Only
 * Listing/Ticketing) and was never meant to double as an on/off switch for site-publish state.
 * Draft takes priority over those in-progress CRM stages (an unpublished event showing as e.g.
 * "Only Listing" is misleading), but NOT over the terminal Cancelled/Expired outcomes, which are
 * checked first.
 *
 * `isDateExpired` is passed in rather than derived here so the caller decides what "today" means
 * (the browser's local midnight on the tracker screen, the server's on the API) — see
 * `isPartnershipEventDateExpired`. The date is checked directly, not just the raw CRM text
 * already saying "expir", because the automatic DB sweep that rewrites that text
 * (markPastPartnershipsAsExpired) only ever touches rows with no linked website Event at all
 * (`event_id IS NULL`) — so a past-dated event that IS linked but still unpublished never got
 * its text updated and kept falling into the Draft bucket by date alone.
 */
export function classifyPartnershipStatus(raw: string, siteStatus?: string, isDateExpired?: boolean): string {
  const s = (raw || '').toLowerCase().trim();
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('expir') || isDateExpired) return 'Expired';
  if (!siteStatus || siteStatus === 'draft') return 'Draft';
  if (!s) return 'Unmapped';
  if ((PARTNERSHIP_STATUS_OPTIONS as readonly string[]).includes(raw)) return raw;
  // Catches bare "listed" too (a lot of real historical data uses that exact word), not just
  // "only listed"/"listed only" — anything mentioning "listed" at all means this bucket.
  if (s.includes('listed') || s.includes('listing') || s.includes('no partnership')) return 'Only Listing';
  if (s.includes('ticket')) return 'Ticketing';
  if (s.includes('done') || s.includes('confirm') || s.includes('complete') || s.includes('executed')) return 'Partnership Done';
  if (s.includes('initiat')) return 'Initiated';
  if (s.includes('draft')) return 'Draft';
  // Legacy "In Progress" / "On Hold" / "Dropped" text (retired concepts) also lands here — the
  // admin reclassifies these manually, they're not auto-migrated to a new bucket.
  return 'Unmapped';
}

/** End date if set, else start date — the single date "has this event passed?" is judged on. */
export function isPartnershipEventDateExpired(
  e: { eventStartDate?: string | null; eventEndDate?: string | null },
  todayMs: number,
): boolean {
  const parse = (s: string | null | undefined): number | null => {
    if (!s) return null;
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d.getTime();
  };
  const refMs = parse(e.eventEndDate) ?? parse(e.eventStartDate);
  return refMs !== null ? refMs < todayMs : false;
}

/**
 * The tracker's "All Active events" headline number: every partnership event except the
 * Expired/Unmapped buckets. Counting by bucket (rather than a flat `length`) is what keeps this
 * number in agreement with the per-status cards and the default table rows — a flat total folded
 * expired events into the headline but into none of the cards beneath it.
 */
export function countActivePartnershipEvents(
  events: Array<{ partnershipStatus: string; siteStatus?: string; eventStartDate?: string | null; eventEndDate?: string | null }>,
  todayMs: number,
): number {
  return events.filter((e) => {
    const bucket = classifyPartnershipStatus(e.partnershipStatus, e.siteStatus, isPartnershipEventDateExpired(e, todayMs));
    return !DEFAULT_HIDDEN_STATUSES.includes(bucket);
  }).length;
}
