/**
 * Event domain types
 */

export interface EventSpeaker {
  name: string;
  designation: string;
  company: string;
  others: string;
}

export interface StartupEvent {
  id?: string | number;
  slug?: string;
  location: string;
  /** The actual country this event belongs to (e.g. "India") — distinct from `location`, which
   * is the specific city/region (e.g. "Mathura") shown as the sub-heading on /events. Without
   * this, grouping by country had to guess from the city name via a small hardcoded list, and
   * any city not on that list (e.g. Mathura) silently became its own top-level section instead
   * of nesting under India. Optional because older events created before this field existed
   * don't have it — /events falls back to the old guessing behavior for those. */
  country?: string;
  /** 'own' | 'other' | undefined — admin override for which section this event's CITY renders
   * under on /events, set in the Partnership Tracker. Undefined for events from the legacy
   * `events` table, which has no such column, so those keep the automatic behaviour. */
  citySectionOverride?: string;
  date: string;
  /** Pre-formatted "23 August - 25 August 2026"-style single/range label — build once in
   * entityToEvent so every consumer (cards, detail page) renders the same clean date, instead of
   * each concatenating date/eventEndDate/times separately. */
  dateRange: string;
  /** Pre-formatted "10:00 AM - 6:00 PM" label, built alongside dateRange for the same reason —
   * one place decides how a time reads. Empty string when the organiser gave no start time (the
   * admin form stores an unset time as 00:00), which callers use to render nothing. */
  timeRange: string;
  title: string;
  url: string;
  excerpt?: string;
  description?: string;
  image?: string;
  status?: 'draft' | 'upcoming' | 'completed' | 'cancelled';
  eventTime?: string | null;
  eventEndDate?: string | null;
  eventEndTime?: string | null;
  venueAddress?: string | null;
  googleLocationLink?: string | null;
  speakers?: EventSpeaker[];
}

/**
 * Database entity
 */
export interface EventEntity {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  description?: string;
  location: string;
  country?: string | null;
  // Dates from MariaDB are returned as strings, but we type them as Date | string for flexibility
  event_date: Date | string;
  event_end_date?: Date | string | null;
  event_time?: string | null;
  event_end_time?: string | null;
  image_url?: string;
  external_url?: string;
  venue_address?: string | null;
  google_location_link?: string | null;
  // JSON column — the mariadb driver auto-parses this into an array; stays untyped from our
  // side since the raw column type is JSON/untyped, mirroring partnership_events.speakers.
  speakers?: EventSpeaker[] | string | null;
  status: 'draft' | 'upcoming' | 'completed' | 'cancelled';
  created_at: Date | string;
  updated_at: Date | string;
  created_by?: string;
  updated_by?: string;
}

/**
 * DTOs for API
 */
export interface CreateEventDto {
  title: string;
  slug: string;
  excerpt?: string;
  description?: string;
  location: string;
  country?: string | null;
  eventDate: Date | string;
  eventEndDate?: Date | string | null;
  eventTime?: string | null;
  eventEndTime?: string | null;
  imageUrl?: string;
  externalUrl?: string;
  venueAddress?: string | null;
  googleLocationLink?: string | null;
  speakers?: EventSpeaker[] | null;
  status?: 'draft' | 'upcoming' | 'completed' | 'cancelled';
  createdBy?: string;
  updatedBy?: string;
}

export interface UpdateEventDto extends Partial<CreateEventDto> {
  id: number;
}

