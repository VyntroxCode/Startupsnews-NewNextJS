import { EventEntity, EventSpeaker } from '../domain/types';
import { StartupEvent } from '../domain/types';

const DEFAULT_EVENT_IMAGE = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80";
const EVENTS_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi").replace(/\/+$/, "");
const EVENTS_BASE = `${EVENTS_SITE}/startup-events`;

function normalizeEventText(value?: string | null): string | undefined {
  if (!value) return undefined;

  const cleaned = value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\.[a-z0-9_-]+\s*\{[^}]*\}/gi, ' ')
    .replace(/@media[^\{]*\{[\s\S]*?\}/gi, ' ')
    .replace(/^\s*(description\s*)?(event details|about event)\s*/i, '')
    .replace(/^\s*description\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || undefined;
}

function normalizeEventDescription(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function toYmd(d: Date | string): { year: number; month: number; day: number } {
  if (d instanceof Date) {
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  const [year, month, day] = d.slice(0, 10).split('-').map(Number);
  return { year, month, day };
}

/**
 * "23 August 2026", or "23 August - 25 August 2026" / "23 August 2026 - 5 January 2027" when an
 * end date is set and differs from the start date — single clean label for cards + detail page,
 * instead of each caller concatenating date/eventEndDate/times separately.
 */
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

function parseSpeakersJson(value: unknown): EventSpeaker[] {
  if (!value) return [];
  // The mariadb driver may return a JSON column as an already-parsed array, a raw JSON
  // string, or a Buffer (when the connection isn't in string mode) — handle all three.
  let parsed: unknown = value;
  if (Buffer.isBuffer(value)) {
    try { parsed = JSON.parse(value.toString('utf8')); } catch { return []; }
  } else if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      name: typeof v.name === 'string' ? v.name : '',
      designation: typeof v.designation === 'string' ? v.designation : '',
      company: typeof v.company === 'string' ? v.company : '',
      others: typeof v.others === 'string' ? v.others : '',
    }))
    .filter((sp) => sp.name.trim().length > 0);
}

/**
 * Convert EventEntity to StartupEvent (backward compatible format)
 */
export function entityToEvent(entity: EventEntity): StartupEvent {
  // Parse YYYY-MM-DD directly to avoid timezone shift (new Date('YYYY-MM-DD') is UTC midnight)
  const formatDateString = (d: Date | string): string => {
    const { year, month, day } = toYmd(d);
    return `${day} ${MONTH_ABBR[month - 1]} ${year}`;
  };

  return {
    id: entity.id.toString(),
    slug: entity.slug,
    location: entity.location,
    date: formatDateString(entity.event_date),
    dateRange: buildDateRange(entity.event_date, entity.event_end_date),
    title: entity.title,
    url: entity.external_url || `${EVENTS_BASE}/${entity.slug}/`,
    excerpt: normalizeEventText(entity.excerpt),
    description: normalizeEventDescription(entity.description),
    image: entity.image_url || DEFAULT_EVENT_IMAGE,
    status: entity.status,
    eventTime: entity.event_time,
    eventEndDate: entity.event_end_date ? formatDateString(entity.event_end_date) : null,
    eventEndTime: entity.event_end_time ?? null,
    venueAddress: entity.venue_address || null,
    googleLocationLink: entity.google_location_link || null,
    speakers: parseSpeakersJson(entity.speakers),
  };
}

/**
 * Convert array of entities to events
 */
export function entitiesToEvents(entities: EventEntity[]): StartupEvent[] {
  return entities.map(entityToEvent);
}

