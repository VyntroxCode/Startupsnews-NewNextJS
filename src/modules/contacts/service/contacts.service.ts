import { queryOne, query } from '@/shared/database/connection';
import { ContactsRepository } from '../repository/contacts.repository';
import { BulkAction, ContactFilters, ContactInput, ContactsConfig, DEFAULT_CONTACTS_CONFIG } from '../domain/types';

const CONFIG_SETTINGS_KEY = 'contacts_config';

function cleanArray(value?: string[]): string[] {
  return Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
}

export class ContactsService {
  constructor(private repository: ContactsRepository) {}

  async getAllContacts(filters?: ContactFilters) {
    return this.repository.findAll(filters);
  }

  async countContacts(filters?: ContactFilters) {
    return this.repository.count(filters);
  }

  async getContactById(id: number) {
    return this.repository.findById(id);
  }

  validateInput(input: ContactInput): string | null {
    if (!input.name || !input.name.trim()) return 'Name is required';
    if (!input.types || !input.types.filter(Boolean).length) return 'At least one type is required';
    return null;
  }

  async createContact(input: ContactInput, actor?: string) {
    const error = this.validateInput(input);
    if (error) throw new Error(error);
    return this.repository.create(
      {
        ...input,
        name: input.name.trim(),
        company: input.company?.trim() || '',
        cities: cleanArray(input.cities),
        emails: cleanArray(input.emails),
        phones: cleanArray(input.phones),
        tags: cleanArray(input.tags),
      },
      actor
    );
  }

  async updateContact(id: number, input: Partial<ContactInput>, actor?: string) {
    const patch: Partial<ContactInput> = { ...input };
    if (patch.name !== undefined && !patch.name.trim()) throw new Error('Name is required');
    if (patch.cities !== undefined) patch.cities = cleanArray(patch.cities);
    if (patch.emails !== undefined) patch.emails = cleanArray(patch.emails);
    if (patch.phones !== undefined) patch.phones = cleanArray(patch.phones);
    if (patch.tags !== undefined) patch.tags = cleanArray(patch.tags);
    return this.repository.update(id, patch, actor);
  }

  async deleteContact(id: number) {
    return this.repository.delete(id);
  }

  async bulkAction(ids: number[], action: BulkAction, value: string | undefined, actor?: string) {
    return this.repository.bulkUpdate(ids, action, value, actor);
  }

  async importContacts(rows: ContactInput[], actor?: string): Promise<{ imported: number; dropped: number }> {
    let imported = 0;
    let dropped = 0;
    for (const row of rows) {
      if (!row.name || !row.name.trim()) {
        dropped++;
        continue;
      }
      await this.repository.create(
        {
          name: row.name.trim(),
          company: row.company?.trim() || '',
          types: cleanArray(row.types),
          cities: cleanArray(row.cities),
          country: row.country?.trim() || '',
          emails: cleanArray(row.emails),
          phones: cleanArray(row.phones),
          linkedin: row.linkedin?.trim() || '',
          instagram: row.instagram?.trim() || '',
          sector: row.sector?.trim() || '',
          stage: row.stage?.trim() || '',
          tags: cleanArray(row.tags),
          notes: row.notes?.trim() || '',
        },
        actor
      );
      imported++;
    }
    return { imported, dropped };
  }

  async getConfig(): Promise<ContactsConfig> {
    const row = await queryOne<{ value: string }>('SELECT value FROM settings WHERE `key` = ?', [CONFIG_SETTINGS_KEY]);
    if (!row?.value) return DEFAULT_CONTACTS_CONFIG;
    try {
      const parsed = JSON.parse(row.value);
      return {
        types: Array.isArray(parsed.types) && parsed.types.length ? parsed.types : DEFAULT_CONTACTS_CONFIG.types,
        cities: Array.isArray(parsed.cities) && parsed.cities.length ? parsed.cities : DEFAULT_CONTACTS_CONFIG.cities,
        countries: Array.isArray(parsed.countries) && parsed.countries.length ? parsed.countries : DEFAULT_CONTACTS_CONFIG.countries,
        tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : DEFAULT_CONTACTS_CONFIG.tags,
      };
    } catch {
      return DEFAULT_CONTACTS_CONFIG;
    }
  }

  async saveConfig(config: ContactsConfig): Promise<void> {
    const value = JSON.stringify(config);
    await query(
      'INSERT INTO settings (`key`, value, type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
      [CONFIG_SETTINGS_KEY, value, 'json']
    );
  }
}
