import { EventEntity } from '../domain/types';
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

/**
 * Convert EventEntity to StartupEvent (backward compatible format)
 */
export function entityToEvent(entity: EventEntity): StartupEvent {
  // Parse YYYY-MM-DD directly to avoid timezone shift (new Date('YYYY-MM-DD') is UTC midnight)
  const formatDateString = (d: Date | string): string => {
    const str = typeof d === 'string' ? d : d.toISOString();
    const [year, month, day] = str.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return {
    id: entity.id.toString(),
    slug: entity.slug,
    location: entity.location,
    date: formatDateString(entity.event_date),
    title: entity.title,
    url: entity.external_url || `${EVENTS_BASE}/${entity.slug}/`,
    excerpt: normalizeEventText(entity.excerpt),
    description: normalizeEventDescription(entity.description),
    image: entity.image_url || DEFAULT_EVENT_IMAGE,
    status: entity.status,
    eventTime: entity.event_time,
    eventEndDate: entity.event_end_date ? formatDateString(entity.event_end_date) : null,
    eventEndTime: entity.event_end_time ?? null,
  };
}

/**
 * Convert array of entities to events
 */
export function entitiesToEvents(entities: EventEntity[]): StartupEvent[] {
  return entities.map(entityToEvent);
}

