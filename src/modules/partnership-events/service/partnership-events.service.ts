import { PartnershipEventsRepository } from '../repository/partnership-events.repository';
import { PartnershipEventEntity, PartnershipEventFilters, PartnershipEventInput, LinkedEventSummary } from '../domain/types';
import { dedupKey, autoExcerpt, parseSpeakers } from '../utils/partnership-events.utils';
import { EventsService, EventNotFoundError } from '@/modules/events/service/events.service';
import { BannersService } from '@/modules/banners/service/banners.service';
import { BannersRepository } from '@/modules/banners/repository/banners.repository';

export interface SyncResult {
  entity: PartnershipEventEntity;
  /** Set when the linked event couldn't be synced cleanly — surfaced to the admin instead of
   * being silently swallowed, so a save that didn't fully do what they expected is visible. */
  warning?: string;
}

// Matches the VARCHAR limits on the `partnership_events` table (see
// add-partnership-events-table.sql / add-partnership-events-lead-details.sql).
const FIELD_LIMITS: Partial<Record<keyof PartnershipEventInput, number>> = {
  eventName: 500,
  city: 255,
  country: 255,
  organiser: 255,
  poc: 255,
  contact: 100,
  email: 255,
  website: 500,
  emailThread: 1000,
  eventStartTime: 20,
  eventEndTime: 20,
  googleLocationLink: 500,
  eventType: 50,
  ticketCurrency: 10,
  ticketPrice: 50,
  posterUrl: 500,
  bannerUrl: 500,
  partnershipStatus: 100,
  partnershipType: 50,
  listing: 50,
  listingLink: 500,
  source: 255,
};

// MariaDB returns DATE columns as either a string or a Date object depending on driver config —
// normalize to plain YYYY-MM-DD so it drops straight into an <input type="date">.
function toYmd(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function clip<K extends keyof PartnershipEventInput>(value: string, field: K): string {
  const limit = FIELD_LIMITS[field];
  return limit && value.length > limit ? value.slice(0, limit) : value;
}

function clipInput<T extends Partial<PartnershipEventInput>>(input: T): T {
  const clipped: T = { ...input };
  for (const field of Object.keys(FIELD_LIMITS) as (keyof PartnershipEventInput)[]) {
    const value = clipped[field];
    if (typeof value === 'string') (clipped[field] as string) = clip(value, field);
  }
  return clipped;
}

export class PartnershipEventsService {
  constructor(
    private repository: PartnershipEventsRepository,
    private eventsService: EventsService,
    // Defaulted rather than wired at each of the five API routes that build this service —
    // only the two save paths below ever touch it (see syncHomepageBanner).
    private bannersService: BannersService = new BannersService(new BannersRepository())
  ) {}

  async getAllEvents(filters?: PartnershipEventFilters) {
    return this.repository.findAll(filters);
  }

  /** Batch-fetches the linked Event summary for every record that has one — for the table/list to show real site status without an N+1. */
  async getLinkedEventSummaries(entities: PartnershipEventEntity[]): Promise<Map<number, LinkedEventSummary>> {
    const ids = [...new Set(entities.map((e) => e.event_id).filter((id): id is number => !!id))];
    const map = new Map<number, LinkedEventSummary>();
    if (ids.length) {
      const events = await this.eventsService.getEventsByIds(ids);
      for (const ev of events) {
        map.set(ev.id, {
          id: ev.id, slug: ev.slug, status: ev.status, location: ev.location, country: ev.country || null,
          description: ev.description || null, eventDate: toYmd(ev.event_date), eventTime: ev.event_time || null,
          externalUrl: ev.external_url || null,
        });
      }
    }

    // Records saved before event_id linking existed (or whose linked event was recreated —
    // see syncLinkedEvent) have no event_id yet, even though a matching website Event may
    // already exist under the exact same title. That adoption used to only run inside
    // create/updateEvent (on Save), so an old row's Slug/View/status silently stayed blank
    // until an admin happened to re-open and re-save that specific record. Doing the same
    // exact-title lookup here means it self-heals the moment the row is next listed or opened,
    // not just on save. Deliberately exact-title only (same match `findByTitle` already uses
    // for the write path) — several real events differ only by a city/date suffix (e.g.
    // "Venture Capital World Summit" vs "Bengaluru 2026 Venture Capital World Summit" are two
    // different live events), so a fuzzy/substring match could silently attach the wrong page.
    const unlinked = entities.filter((e) => !e.event_id);
    for (const entity of unlinked) {
      const match = await this.eventsService.getEventByTitle(entity.event_name);
      if (!match) continue;
      await this.repository.setEventId(entity.id, match.id);
      entity.event_id = match.id;
      map.set(match.id, {
        id: match.id, slug: match.slug, status: match.status, location: match.location, country: match.country || null,
        description: match.description || null, eventDate: toYmd(match.event_date), eventTime: match.event_time || null,
        externalUrl: match.external_url || null,
      });
    }
    return map;
  }

  async countEvents(filters?: PartnershipEventFilters) {
    return this.repository.count(filters);
  }

  async getEventById(id: number) {
    return this.repository.findById(id);
  }

  /** Public listing source for /events, the sidebar widget, sitemap, etc. — no caching here,
   * callers (data-adapter.ts) already wrap their own Redis cache around the whole result. */
  async getUpcomingForPublic() {
    return this.repository.findForPublicUpcoming();
  }

  /** Public single-event lookup by slug — returns null for a draft the same way
   * data-adapter's old getEventBySlug did for the `events` table's status column. */
  async getPublicEventBySlug(slug: string) {
    const entity = await this.repository.findBySlug(slug);
    if (!entity || entity.site_status === 'draft') return null;
    return entity;
  }

  validateInput(input: PartnershipEventInput): string | null {
    if (!input.eventName || !input.eventName.trim()) return 'Event name is required';
    return null;
  }

  async createEvent(input: PartnershipEventInput, actor?: string): Promise<SyncResult> {
    const error = this.validateInput(input);
    if (error) throw new Error(error);
    const slug = await this.resolveSlug(input.slug, input.eventName);
    const siteStatus = input.siteStatus ?? 'draft';
    const entity = await this.repository.create(
      clipInput({ ...input, eventName: input.eventName.trim(), slug, siteStatus }),
      actor
    );
    const synced = await this.syncLinkedEvent(entity, input, actor);
    return this.syncHomepageBanner(synced, input, actor);
  }

  async updateEvent(id: number, input: Partial<PartnershipEventInput>, actor?: string): Promise<SyncResult | null> {
    if (input.eventName !== undefined && !input.eventName.trim()) throw new Error('Event name is required');
    // createEvent() has always trimmed eventName before saving; this didn't — an update carrying
    // incidental leading/trailing whitespace persisted it untrimmed, letting the stored
    // event_name silently drift from the linked website Event's own (trimmed) title. That drift
    // is exactly what could make syncLinkedEvent's findByTitle safety net miss a still-live event
    // and wrongly create a duplicate instead of updating it.
    const normalizedInput = input.eventName !== undefined ? { ...input, eventName: input.eventName.trim() } : input;
    // Only re-resolve the slug when the caller actually sent one (or the modal's Add/Edit path,
    // which always sends region/siteStatus) — bulk CSV import updates (dedupKey matches) don't
    // touch slug/siteStatus at all, so an already-listed row's public URL never moves under it.
    const touchesPublicFields = input.slug !== undefined || input.siteStatus !== undefined;
    const withSlug = touchesPublicFields
      ? { ...normalizedInput, slug: await this.resolveSlug(input.slug, normalizedInput.eventName, id) }
      : normalizedInput;
    const entity = await this.repository.update(id, clipInput(withSlug), actor);
    if (!entity) return null;
    const synced = await this.syncLinkedEvent(entity, input, actor);
    return this.syncHomepageBanner(synced, input, actor);
  }

  /**
   * Auto-generates a unique slug from the event name when none is supplied, mirroring
   * EventsService.createEvent/updateEvent's algorithm exactly (kept in sync intentionally —
   * this is the same pattern applied to partnership_events' own slug column now that it's the
   * public read source instead of a downstream copy).
   */
  private async resolveSlug(explicit: string | undefined, eventName: string | undefined, excludeId?: number): Promise<string> {
    const base = (explicit && explicit.trim())
      || (eventName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let candidate = base;
    let counter = 1;
    while (await this.repository.slugExists(candidate, excludeId)) {
      candidate = `${base}-${counter}`;
      counter++;
    }
    return candidate;
  }

  /**
   * Creates or updates the linked public Event from the same submit that saves the
   * partnership record — this is the whole point of the merge, no second form to fill.
   * Only runs when the form actually sent region/siteStatus (i.e. the real modal, not
   * bulk CSV import, which calls the repository directly and is left untouched on purpose —
   * importing hundreds of rows shouldn't silently spawn hundreds of draft Events).
   *
   * Deliberately never lets a sync failure fail the whole save — the partnership record
   * the admin just carefully filled in must never be lost just because the website-listing
   * half of this had a problem. But it must also never silently create a DUPLICATE live
   * event: recreating the linked event is only correct when it genuinely no longer exists
   * (EventNotFoundError — e.g. deleted independently from the Events tab). Any other update
   * failure (a transient DB error, say) is reported back as a warning instead of triggering
   * a recreate, so a hiccup can't multiply one event into two.
   *
   * Whenever there's no confirmed live event_id to update (never linked, or just proved
   * stale above), title is checked against existing website Events before creating anything
   * — records saved before event_id linking existed would otherwise recreate a fresh
   * duplicate on every single edit, forever, since they'd never have an event_id to reuse.
   */
  private async syncLinkedEvent(
    entity: PartnershipEventEntity,
    input: Partial<PartnershipEventInput>,
    actor?: string
  ): Promise<SyncResult> {
    if (input.region === undefined && input.siteStatus === undefined) return { entity };
    const region = input.region?.trim();
    if (!region) return { entity };
    // The public site groups events by city (e.g. "Mumbai"), not by the broader Region/Country
    // dropdown value (e.g. "India") — prefer the specific City field when one's set, falling
    // back to region for cases with no separate city concept (UAE, Singapore, "Cohort"/"Online"
    // and other non-geographic regions, where City is typically left blank).
    const location = entity.city?.trim() || region;

    const eventFields = {
      title: entity.event_name,
      slug: input.slug?.trim() || '',
      description: entity.description || undefined,
      excerpt: autoExcerpt(entity.description),
      location,
      // The actual Region/Country value ("India", "UAE", "Cohort", ...) — stored as its own
      // field so /events can group by real country instead of guessing from the city name (see
      // groupByCountry's REGION_COUNTRY comment for the bug this fixes, e.g. "Mathura" not being
      // recognised as an Indian city and landing in its own top-level section).
      country: region,
      eventEndDate: entity.event_end_date || null,
      eventTime: entity.event_start_time || undefined,
      eventEndTime: entity.event_end_time || null,
      imageUrl: entity.poster_url || undefined,
      externalUrl: entity.website || undefined,
      venueAddress: entity.venue_address || null,
      googleLocationLink: entity.google_location_link || null,
      speakers: parseSpeakers(entity.speakers),
      status: input.siteStatus || 'draft',
    };

    let recreateReason: 'deleted' | null = null;

    try {
      if (entity.event_id) {
        try {
          await this.eventsService.updateEvent(entity.event_id, { ...eventFields, updatedBy: actor });
          return { entity };
        } catch (err) {
          if (!(err instanceof EventNotFoundError)) {
            // Not "it's gone" — some other failure (DB hiccup, etc). Don't recreate: that
            // would leave two live events for one partnership record. Report it and stop.
            console.error(`Partnership event ${entity.id}: linked event ${entity.event_id} update failed:`, err);
            return { entity, warning: 'Saved, but the linked website event could not be updated — please try saving again.' };
          }
          // The linked event really was deleted independently (e.g. from the Events tab) —
          // the stored event_id is now stale. Fall through and create a fresh one instead of
          // leaving this record permanently unable to sync.
          recreateReason = 'deleted';
          console.warn(`Partnership event ${entity.id}: linked event ${entity.event_id} no longer exists, recreating:`, err);
        }
      }

      // No confirmed linked event at this point. Adopt an existing website Event with the
      // exact same title if one exists, instead of creating a fresh duplicate — this is the
      // common case for records saved before event_id linking existed.
      const titleMatch = await this.eventsService.getEventByTitle(entity.event_name);
      if (titleMatch) {
        await this.eventsService.updateEvent(titleMatch.id, { ...eventFields, updatedBy: actor });
        await this.repository.setEventId(entity.id, titleMatch.id);
        return { entity: { ...entity, event_id: titleMatch.id } };
      }

      if (!entity.event_start_date) return { entity }; // creating a new linked event needs a date; updating an existing one doesn't need it re-supplied

      const created = await this.eventsService.createEvent({
        ...eventFields,
        eventDate: entity.event_start_date,
        createdBy: actor,
      });
      await this.repository.setEventId(entity.id, created.id);
      const warning = recreateReason === 'deleted'
        ? 'The previously linked website event was missing (likely deleted from the Events tab) and has been recreated.'
        : undefined;
      return { entity: { ...entity, event_id: created.id }, warning };
    } catch (err) {
      console.error(`Partnership event ${entity.id}: failed to sync linked event:`, err);
      return { entity, warning: 'Saved, but syncing to the live event listing failed — please try saving again.' };
    }
  }

  /**
   * Publishes the tracker's "Event banner (homepage)" image to the real homepage carousel —
   * scheduled, never immediate: the banner sits in the `banners` table with start_date set to
   * the admin-chosen Banner Start Date, and BannersRepository.findAll's date filter (plus
   * BannerCarousel's own start/end check) keeps it invisible on the site until that day
   * arrives. The admin form makes the date mandatory the moment a banner image is added, so a
   * banner can never reach the homepage without an explicit go-live date.
   *
   * The row is auto-managed: banner_id remembers it so re-saving updates it in place instead
   * of stacking duplicates, and it's deactivated (never deleted) when the image is cleared, so
   * nothing an admin hand-tuned in Admin → Banners is destroyed and re-adding is one save away.
   *
   * Like syncLinkedEvent, a failure here never fails the save — the partnership record the
   * admin just filled in matters more than the carousel; the problem comes back as a warning.
   */
  private async syncHomepageBanner(
    result: SyncResult,
    input: Partial<PartnershipEventInput>,
    actor?: string
  ): Promise<SyncResult> {
    // Only the paths that actually carry these fields (the Add/Edit modal) touch the homepage.
    // Bulk CSV import goes straight to the repository and never reaches here at all.
    if (input.bannerUrl === undefined && input.bannerStartDate === undefined && input.bannerActive === undefined) return result;

    const { entity } = result;
    const imageUrl = entity.banner_url?.trim() || '';
    const startDate = toYmd(entity.banner_start_date);

    try {
      if (!imageUrl || !startDate) {
        if (entity.banner_id) {
          await this.bannersService.updateBanner({ id: entity.banner_id, isActive: false, updatedBy: actor });
        }
        return result;
      }

      const linked = entity.event_id ? (await this.eventsService.getEventsByIds([entity.event_id]))[0] : undefined;
      // Two independent reasons to keep the row switched off: the admin turned the banner off by
      // hand (banner_active — the "take it down without losing the image" case), or the banner
      // advertises a Draft/Cancelled listing, which would link to a page that isn't live. NULL
      // banner_active means a row predating the column, which stays on, as it was before.
      const adminEnabled = entity.banner_active === null || entity.banner_active === undefined
        ? true
        : Boolean(Number(entity.banner_active));
      const isActive = adminEnabled && (!linked || (linked.status !== 'draft' && linked.status !== 'cancelled'));
      // Whole-day window: live from midnight on the chosen day, and only retired once the
      // event's own last day is over (the carousel filters start_date <= NOW() <= end_date).
      const endSource = toYmd(entity.event_end_date) || toYmd(entity.event_start_date);
      const fields = {
        title: entity.event_name,
        imageUrl,
        linkUrl: linked?.slug ? `/startup-events/${linked.slug}` : '',
        isActive,
        startDate: `${startDate} 00:00:00`,
        ...(endSource ? { endDate: `${endSource} 23:59:59` } : {}),
      };

      // banner_id can point at a row since deleted from Admin → Banners — recreate in that case.
      const existing = entity.banner_id ? await this.bannersService.getBannerById(entity.banner_id) : null;
      if (existing) {
        // display_order is deliberately carried over, not reset — ordering is the Banners
        // admin's call, and re-saving the tracker record shouldn't reshuffle the carousel.
        await this.bannersService.updateBanner({ ...fields, id: existing.id, order: existing.display_order, updatedBy: actor });
      } else {
        const created = await this.bannersService.createBanner({ ...fields, order: 0, createdBy: actor, updatedBy: actor });
        const bannerId = Number(created.id);
        await this.repository.setBannerId(entity.id, bannerId);
        entity.banner_id = bannerId;
      }
      return result;
    } catch (err) {
      console.error(`Partnership event ${entity.id}: failed to sync homepage banner:`, err);
      return { ...result, warning: result.warning || 'Saved, but the homepage banner could not be scheduled — please try saving again.' };
    }
  }

  async deleteEvent(id: number) {
    await this.retireHomepageBanners([id]);
    return this.repository.delete(id);
  }

  async bulkDelete(ids: number[]) {
    await this.retireHomepageBanners(ids);
    return this.repository.bulkDelete(ids);
  }

  /**
   * Switches off the auto-managed homepage banners of records about to be deleted — without
   * this the `banners` row outlives its tracker record and keeps running on the homepage with
   * nothing left to edit it from. Deactivated rather than deleted, matching syncHomepageBanner,
   * so the row stays visible (and restorable) in Admin → Banners. Never blocks the delete.
   */
  private async retireHomepageBanners(ids: number[]): Promise<void> {
    for (const id of ids) {
      try {
        const entity = await this.repository.findById(id);
        if (entity?.banner_id) await this.bannersService.updateBanner({ id: entity.banner_id, isActive: false });
      } catch (err) {
        console.error(`Partnership event ${id}: failed to retire its homepage banner before delete:`, err);
      }
    }
  }

  /**
   * Rows sharing the same name + city + country + start date as an existing
   * event (this batch or already in the DB) update that event in place
   * instead of creating a duplicate.
   */
  async importEvents(rows: PartnershipEventInput[], actor?: string): Promise<{ imported: number; updated: number; dropped: number }> {
    let imported = 0;
    let updated = 0;
    let dropped = 0;

    const existing = await this.repository.findAll();
    const keyToId = new Map<string, number>();
    for (const e of existing) {
      const key = dedupKey({ eventName: e.event_name, city: e.city || '', country: e.country || '', eventStartDate: e.event_start_date || '' });
      if (key !== null) keyToId.set(key, e.id);
    }

    for (const row of rows) {
      if (!row.eventName || !row.eventName.trim()) {
        dropped++;
        continue;
      }
      const key = dedupKey(row);
      const matchId = key !== null ? keyToId.get(key) : undefined;

      try {
        if (matchId !== undefined) {
          await this.repository.update(matchId, clipInput({ ...row, eventName: row.eventName.trim() }), actor);
          updated++;
        } else {
          const created = await this.repository.create(clipInput({ ...row, eventName: row.eventName.trim() }), actor);
          imported++;
          if (key !== null) keyToId.set(key, created.id);
        }
      } catch (error) {
        console.error('Error importing partnership event row:', row.eventName, error);
        dropped++;
      }
    }
    return { imported, updated, dropped };
  }
}
