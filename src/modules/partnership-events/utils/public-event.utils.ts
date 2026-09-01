import { PartnershipEventEntity } from '../domain/types';
import { StartupEvent, EventSpeaker } from '@/modules/events/domain/types';
import { parseSpeakers, autoExcerpt } from './partnership-events.utils';

// Mirrors src/modules/events/utils/events.utils.ts's entityToEvent exactly — partnership_events
// is now the direct public source, so this produces the same StartupEvent shape every existing
// consumer (EventsCarousel, EventByCountryCard, StartupEventsSection, /startup-events/[slug])
// already expects, unchanged.
const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80";
const EVENTS_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi").replace(/\/+$/, "");
const EVENTS_BASE = `${EVENTS_SITE}/startup-events`;

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toYmd(d: Date | string): { year: number; month: number; day: number } {
  if (d instanceof Date) {
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  const [year, month, day] = d.slice(0, 10).split('-').map(Number);
  return { year, month, day };
}

function formatDateString(d: Date | string): string {
  const { year, month, day } = toYmd(d);
  return `${day} ${MONTH_ABBR[month - 1]} ${year}`;
}

function buildDateRange(start: Date | string, end: Date | string | null | undefined): string {
  const s = toYmd(start);
  const startLabel = `${s.day} ${MONTH_FULL[s.month - 1]} ${s.year}`;
  if (!end) return startLabel;
  const e = toYmd(end);
  if (e.year === s.year && e.month === s.month && e.day === s.day) return startLabel;
  const endMonthDay = `${e.day} ${MONTH_FULL[e.month - 1]}`;
  if (e.year === s.year) return `${s.day} ${MONTH_FULL[s.month - 1]} - ${endMonthDay} ${s.year}`;
  return `${startLabel} - ${endMonthDay} ${e.year}`;
}

function normalizeEventText(value?: string | null): string | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
}

/**
 * Convert a PartnershipEventEntity into the same StartupEvent shape entityToEvent (events
 * module) produces — field mapping mirrors what syncLinkedEvent used to push into `events`.
 * Requires slug + event_start_date to be set (public queries already filter on both); callers
 * with a row missing either should not reach this.
 */
export function partnershipEntityToStartupEvent(entity: PartnershipEventEntity): StartupEvent {
  const slug = entity.slug || String(entity.id);
  const startDate = entity.event_start_date as string;
  const speakers: EventSpeaker[] = parseSpeakers(entity.speakers);
  const status = entity.site_status || 'draft';

  return {
    id: entity.id.toString(),
    slug,
    location: entity.city?.trim() || entity.country?.trim() || '',
    country: entity.country?.trim() || undefined,
    date: formatDateString(startDate),
    dateRange: buildDateRange(startDate, entity.event_end_date),
    title: entity.event_name,
    url: entity.website || `${EVENTS_BASE}/${slug}/`,
    excerpt: autoExcerpt(entity.description, 200) ?? normalizeEventText(entity.description),
    description: entity.description?.trim() || undefined,
    image: entity.poster_url || DEFAULT_EVENT_IMAGE,
    status,
    eventTime: entity.event_start_time,
    eventEndDate: entity.event_end_date ? formatDateString(entity.event_end_date) : null,
    eventEndTime: entity.event_end_time ?? null,
    venueAddress: entity.venue_address || null,
    googleLocationLink: entity.google_location_link || null,
    speakers,
  };
}

export function partnershipEntitiesToStartupEvents(entities: PartnershipEventEntity[]): StartupEvent[] {
  return entities.map(partnershipEntityToStartupEvent);
}
