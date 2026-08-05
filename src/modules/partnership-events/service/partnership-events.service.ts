import { PartnershipEventsRepository } from '../repository/partnership-events.repository';
import { PartnershipEventFilters, PartnershipEventInput } from '../domain/types';
import { dedupKey } from '../utils/partnership-events.utils';

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
  constructor(private repository: PartnershipEventsRepository) {}

  async getAllEvents(filters?: PartnershipEventFilters) {
    return this.repository.findAll(filters);
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
    return this.repository.create(clipInput({ ...input, eventName: input.eventName.trim() }), actor);
  }

  async updateEvent(id: number, input: Partial<PartnershipEventInput>, actor?: string) {
    if (input.eventName !== undefined && !input.eventName.trim()) throw new Error('Event name is required');
    return this.repository.update(id, clipInput(input), actor);
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
