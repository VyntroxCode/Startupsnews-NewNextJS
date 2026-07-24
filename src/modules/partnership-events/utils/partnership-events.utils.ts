import { PartnershipEvent, PartnershipEventEntity, Speaker } from '../domain/types';

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
function parseSpeakers(value: unknown): Speaker[] {
  return parseJsonArray(value)
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      name: typeof v.name === 'string' ? v.name : '',
      designation: typeof v.designation === 'string' ? v.designation : '',
      company: typeof v.company === 'string' ? v.company : '',
    }))
    .filter((s) => s.name.trim().length > 0);
}
function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

export function entityToPartnershipEvent(entity: PartnershipEventEntity): PartnershipEvent {
  return {
    id: entity.id,
    eventName: entity.event_name || '',
    city: entity.city || '',
    country: entity.country || '',
    organiser: entity.organiser || '',
    poc: entity.poc || '',
    contact: entity.contact || '',
    email: entity.email || '',
    website: entity.website || '',
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
    socialCreatives: parseStringArray(entity.social_creatives),
    partnershipStatus: entity.partnership_status || '',
    partnershipType: entity.partnership_type || '',
    lastUpdatedDate: entity.last_updated_date || '',
    comment: entity.comment || '',
    listing: entity.listing || '',
    listingLink: entity.listing_link || '',
    source: entity.source || '',
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

export const STANDARD_HEADERS = [
  'Name of the event', 'City', 'Country', 'Organiser/Company Name', 'POC - Name',
  'Contact No.', 'Email ID', 'Website Link', 'Initiated date', 'Event Start Date',
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

/** Same identity rule as the original standalone tool: name + city + country + start date. */
export function dedupKey(e: { eventName: string; city?: string | null; country?: string | null; eventStartDate?: string | null }): string | null {
  const city = (e.city || '').trim().toLowerCase();
  const country = (e.country || '').trim().toLowerCase();
  const start = (e.eventStartDate || '').trim();
  if (!city && !country && !start) return null;
  return [(e.eventName || '').trim().toLowerCase(), city, country, start].join('|');
}
