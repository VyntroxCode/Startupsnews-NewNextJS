import { PartnershipEventsRepository } from '../repository/partnership-events.repository';
import { PartnershipEventEntity, PartnershipEventFilters, PartnershipEventInput, LinkedEventSummary } from '../domain/types';
import { dedupKey, autoExcerpt } from '../utils/partnership-events.utils';
import { EventsService } from '@/modules/events/service/events.service';

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
  eventType: 20,
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
    private eventsService: EventsService
  ) {}

  async getAllEvents(filters?: PartnershipEventFilters) {
    return this.repository.findAll(filters);
  }

  /** Batch-fetches the linked Event summary for every record that has one — for the table/list to show real site status without an N+1. */
  async getLinkedEventSummaries(entities: PartnershipEventEntity[]): Promise<Map<number, LinkedEventSummary>> {
    const ids = [...new Set(entities.map((e) => e.event_id).filter((id): id is number => !!id))];
    const map = new Map<number, LinkedEventSummary>();
    if (!ids.length) return map;
    const events = await this.eventsService.getEventsByIds(ids);
    for (const ev of events) {
      map.set(ev.id, { id: ev.id, slug: ev.slug, status: ev.status, location: ev.location });
    }
    return map;
  }

  async countEvents(filters?: PartnershipEventFilters) {
    return this.repository.count(filters);
  }

  async getEventById(id: number) {
    return this.repository.findById(id);
  }

  validateInput(input: PartnershipEventInput): string | null {
    if (!input.eventName || !input.eventName.trim()) return 'Event name is required';
    return null;
  }

  async createEvent(input: PartnershipEventInput, actor?: string) {
    const error = this.validateInput(input);
    if (error) throw new Error(error);
    const entity = await this.repository.create(clipInput({ ...input, eventName: input.eventName.trim() }), actor);
    return this.syncLinkedEvent(entity, input, actor);
  }

  async updateEvent(id: number, input: Partial<PartnershipEventInput>, actor?: string) {
    if (input.eventName !== undefined && !input.eventName.trim()) throw new Error('Event name is required');
    const entity = await this.repository.update(id, clipInput(input), actor);
    if (!entity) return null;
    return this.syncLinkedEvent(entity, input, actor);
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
   * half of this had a problem. Errors are logged server-side; the record simply keeps
   * (or ends up with) no linked event, visible in the UI as "Not listed yet", and the next
   * edit+save retries the sync.
   */
  private async syncLinkedEvent(
    entity: PartnershipEventEntity,
    input: Partial<PartnershipEventInput>,
    actor?: string
  ): Promise<PartnershipEventEntity> {
    if (input.region === undefined && input.siteStatus === undefined) return entity;
    const region = input.region?.trim();
    if (!region) return entity;

    const eventFields = {
      title: entity.event_name,
      description: entity.description || undefined,
      excerpt: autoExcerpt(entity.description),
      location: region,
      eventEndDate: entity.event_end_date || null,
      eventTime: entity.event_start_time || undefined,
      eventEndTime: entity.event_end_time || null,
      imageUrl: entity.poster_url || undefined,
      externalUrl: entity.website || undefined,
      status: input.siteStatus || 'draft',
    };

    try {
      if (entity.event_id) {
        try {
          await this.eventsService.updateEvent(entity.event_id, { ...eventFields, updatedBy: actor });
          return entity;
        } catch (err) {
          // The linked event may have been deleted independently (e.g. from the Events tab) —
          // the stored event_id is now stale. Fall through and create a fresh one instead of
          // leaving this record permanently unable to sync.
          console.warn(`Partnership event ${entity.id}: linked event ${entity.event_id} update failed, recreating instead:`, err);
        }
      }

      if (!entity.event_start_date) return entity; // creating a new linked event needs a date; updating an existing one doesn't need it re-supplied

      const created = await this.eventsService.createEvent({
        ...eventFields,
        slug: '',
        eventDate: entity.event_start_date,
        createdBy: actor,
      });
      await this.repository.setEventId(entity.id, created.id);
      return { ...entity, event_id: created.id };
    } catch (err) {
      console.error(`Partnership event ${entity.id}: failed to sync linked event:`, err);
      return entity;
    }
  }

  async deleteEvent(id: number) {
    return this.repository.delete(id);
  }

  async bulkDelete(ids: number[]) {
    return this.repository.bulkDelete(ids);
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
