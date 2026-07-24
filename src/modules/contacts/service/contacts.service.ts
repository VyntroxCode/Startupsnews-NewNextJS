import { queryOne, query } from '@/shared/database/connection';
import { ContactsRepository } from '../repository/contacts.repository';
import { BulkAction, ContactFilters, ContactInput, ContactsConfig, DEFAULT_CONTACTS_CONFIG } from '../domain/types';

const CONFIG_SETTINGS_KEY = 'contacts_config';

function cleanArray(value?: string[]): string[] {
  return Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
}

// Matches the VARCHAR limits on the `contacts` table (see add-contacts-table.sql).
const FIELD_LIMITS: Record<string, number> = {
  name: 255,
  company: 255,
  country: 100,
  linkedin: 500,
  instagram: 255,
  sector: 255,
  stage: 100,
};

function clip(value: string, field: keyof typeof FIELD_LIMITS): string {
  const limit = FIELD_LIMITS[field];
  return value.length > limit ? value.slice(0, limit) : value;
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
        name: clip(input.name.trim(), 'name'),
        company: clip(input.company?.trim() || '', 'company'),
        country: clip(input.country?.trim() || '', 'country'),
        linkedin: clip(input.linkedin?.trim() || '', 'linkedin'),
        instagram: clip(input.instagram?.trim() || '', 'instagram'),
        sector: clip(input.sector?.trim() || '', 'sector'),
        stage: clip(input.stage?.trim() || '', 'stage'),
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
    if (patch.name !== undefined) patch.name = clip(patch.name.trim(), 'name');
    if (patch.company !== undefined) patch.company = clip(patch.company.trim(), 'company');
    if (patch.country !== undefined) patch.country = clip(patch.country.trim(), 'country');
    if (patch.linkedin !== undefined) patch.linkedin = clip(patch.linkedin.trim(), 'linkedin');
    if (patch.instagram !== undefined) patch.instagram = clip(patch.instagram.trim(), 'instagram');
    if (patch.sector !== undefined) patch.sector = clip(patch.sector.trim(), 'sector');
    if (patch.stage !== undefined) patch.stage = clip(patch.stage.trim(), 'stage');
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
      try {
        await this.repository.create(
          {
            name: clip(row.name.trim(), 'name'),
            company: clip(row.company?.trim() || '', 'company'),
            types: cleanArray(row.types),
            cities: cleanArray(row.cities),
            country: clip(row.country?.trim() || '', 'country'),
            emails: cleanArray(row.emails),
            phones: cleanArray(row.phones),
            linkedin: clip(row.linkedin?.trim() || '', 'linkedin'),
            instagram: clip(row.instagram?.trim() || '', 'instagram'),
            sector: clip(row.sector?.trim() || '', 'sector'),
            stage: clip(row.stage?.trim() || '', 'stage'),
            tags: cleanArray(row.tags),
            notes: row.notes?.trim() || '',
          },
          actor
        );
        imported++;
      } catch (error) {
        console.error('Error importing contact row:', row.name, error);
        dropped++;
      }
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
