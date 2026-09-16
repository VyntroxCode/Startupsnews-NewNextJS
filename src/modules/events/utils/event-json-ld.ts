import type { StartupEvent } from '../domain/types';

/**
 * schema.org Event JSON-LD for /startup-events/[slug].
 *
 * Built from the same StartupEvent every event page already loads, so an event created in the
 * Partnership Tracker gets its structured data on first render — nothing to maintain per event.
 * Every field is optional in the source data, so each one is emitted only when it's actually known
 * (JSON.stringify drops the undefined ones) rather than filled with a guess.
 */

const CURRENCY_ALIASES: Record<string, string> = {
  '₹': 'INR', RS: 'INR', 'RS.': 'INR',
  '$': 'USD', 'US$': 'USD',
  '€': 'EUR', '£': 'GBP',
};

/** Admin-typed currency ("INR", "₹", "usd") -> ISO 4217 code, or undefined when unrecognisable. */
function toCurrencyCode(raw?: string): string | undefined {
  const value = raw?.trim().toUpperCase();
  if (!value) return undefined;
  if (CURRENCY_ALIASES[value]) return CURRENCY_ALIASES[value];
  return /^[A-Z]{3}$/.test(value) ? value : undefined;
}

/** "₹1,999" -> "1999", "Free" -> "0"; undefined when there's no number in it at all. */
function toPrice(raw?: string): string | undefined {
  if (!raw) return undefined;
  if (/free/i.test(raw)) return '0';
  const match = raw.replace(/,/g, '').match(/\d+(\.\d+)?/);
  return match ? match[0] : undefined;
}

/**
 * "2026-09-15" + "18:30:00" -> "2026-09-15T18:30:00+05:30". Date-only when there's no time —
 * including 00:00, which the admin form stores for "not filled in" (same rule as buildTimeRange).
 * The offset is only added for Indian events: the DB stores local wall-clock time with no zone, and
 * leaving it off for other countries lets Google read it in the venue's own timezone instead of
 * wrongly pinning an overseas event to IST.
 */
function toIsoDateTime(date: string | null | undefined, time: string | null | undefined, offset?: string): string | undefined {
  const day = date?.slice(0, 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  const hm = time?.slice(0, 5);
  if (!hm || !/^\d{2}:\d{2}$/.test(hm) || hm === '00:00') return day;
  return `${day}T${hm}:00${offset ?? ''}`;
}

function buildLocation(event: StartupEvent) {
  if (event.isOnline) {
    return { '@type': 'VirtualLocation', url: event.url };
  }
  return {
    '@type': 'Place',
    name: event.venueAddress || event.location,
    address: {
      '@type': 'PostalAddress',
      streetAddress: event.venueAddress || undefined,
      addressLocality: event.city || event.location || undefined,
      addressCountry: event.country || undefined,
    },
    hasMap: event.googleLocationLink || undefined,
  };
}

function buildOffers(event: StartupEvent, isIndia: boolean) {
  if (!event.url) return undefined;
  const price = toPrice(event.ticketPrice);
  const currency = toCurrencyCode(event.ticketCurrency) ?? (isIndia ? 'INR' : undefined);
  return {
    '@type': 'Offer',
    url: event.url,
    availability: event.status === 'upcoming' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    // price without a currency is invalid for Google, so the pair goes in together or not at all
    ...(price && currency ? { price, priceCurrency: currency } : {}),
  };
}

export function buildEventJsonLd(event: StartupEvent, pageUrl: string) {
  const isIndia = event.country?.trim().toLowerCase() === 'india';
  const offset = isIndia ? '+05:30' : undefined;
  const startDate = toIsoDateTime(event.startDateRaw, event.eventTime, offset);
  const endDate = toIsoDateTime(event.endDateRaw || event.startDateRaw, event.eventEndTime, offset);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${pageUrl}#event`,
    name: event.title,
    description: event.excerpt?.slice(0, 500) || undefined,
    url: pageUrl,
    image: event.image ? [event.image] : undefined,
    startDate,
    endDate,
    eventStatus: event.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: event.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    location: buildLocation(event),
    organizer: event.organiser
      ? {
          '@type': 'Organization',
          name: event.organiser,
          // event.url is the organiser's site when one was given, else our own page — only the former describes them
          ...(event.url && !event.url.startsWith(pageUrl) ? { url: event.url } : {}),
        }
      : undefined,
    performer: event.speakers?.length
      ? event.speakers.map((sp) => ({
          '@type': 'Person',
          name: sp.name,
          jobTitle: sp.designation || undefined,
          ...(sp.company ? { worksFor: { '@type': 'Organization', name: sp.company } } : {}),
        }))
      : undefined,
    offers: buildOffers(event, isIndia),
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
  };
}

/** JSON for a <script type="application/ld+json">. Escapes "<" because titles and descriptions
 * come from public event submissions — a literal "</script>" in one must not close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
