import { PartnershipEvent, PartnershipEventEntity, Speaker, SocialCreative, SOCIAL_CREATIVE_PLATFORMS } from '../domain/types';

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
