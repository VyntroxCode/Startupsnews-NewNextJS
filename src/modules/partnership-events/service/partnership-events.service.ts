import { PartnershipEventsRepository } from '../repository/partnership-events.repository';
import { PartnershipEventFilters, PartnershipEventInput } from '../domain/types';
import { dedupKey } from '../utils/partnership-events.utils';

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
    return this.repository.create({ ...input, eventName: input.eventName.trim() }, actor);
  }

  async updateEvent(id: number, input: Partial<PartnershipEventInput>, actor?: string) {
    if (input.eventName !== undefined && !input.eventName.trim()) throw new Error('Event name is required');
    return this.repository.update(id, input, actor);
  }

  async deleteEvent(id: number) {
    return this.repository.delete(id);
  }

  async bulkDelete(ids: number[]) {
    return this.repository.bulkDelete(ids);
  }

  /**
   * Mirrors the standalone tool's import behaviour: rows sharing the same
   * name + city + country + start date as an already-imported row (this batch
   * or existing DB rows) are skipped rather than creating a duplicate event.
   */
  async importEvents(rows: PartnershipEventInput[], actor?: string): Promise<{ imported: number; dropped: number; duplicates: number }> {
    let imported = 0;
    let dropped = 0;
    let duplicates = 0;

    const existing = await this.repository.findAll();
    const seenKeys = new Set(
      existing
        .map((e) => dedupKey({ eventName: e.event_name, city: e.city || '', country: e.country || '', eventStartDate: e.event_start_date || '' }))
        .filter((k): k is string => k !== null)
    );

    for (const row of rows) {
      if (!row.eventName || !row.eventName.trim()) {
        dropped++;
        continue;
      }
      const key = dedupKey(row);
      if (key !== null) {
        if (seenKeys.has(key)) {
          duplicates++;
          continue;
        }
        seenKeys.add(key);
      }
      await this.repository.create({ ...row, eventName: row.eventName.trim() }, actor);
      imported++;
    }
    return { imported, dropped, duplicates };
  }
}
