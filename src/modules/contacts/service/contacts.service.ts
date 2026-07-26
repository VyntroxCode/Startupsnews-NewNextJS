import { queryOne, query } from '@/shared/database/connection';
import { ContactsRepository } from '../repository/contacts.repository';
import { BulkAction, ContactFilters, ContactInput, ContactsConfig, DEFAULT_CONTACTS_CONFIG } from '../domain/types';
import { entityToContact } from '../utils/contacts.utils';

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

function normEmail(e: string): string {
  return e.trim().toLowerCase();
}

function normPhone(p: string): string {
  return p.replace(/\D/g, '');
}

// Case-insensitive union that keeps the first-seen casing.
function unionArrays(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...a, ...b]) {
    const key = v.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
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

  async importContacts(rows: ContactInput[], actor?: string): Promise<{ imported: number; updated: number; dropped: number }> {
    let imported = 0;
    let updated = 0;
    let dropped = 0;

    // Existing contacts sharing an email or phone with an imported row are updated
    // in place instead of creating a duplicate record.
    const indexRows = await this.repository.findEmailPhoneIndex();
    const emailIndex = new Map<string, number>();
    const phoneIndex = new Map<string, number>();
    for (const r of indexRows) {
      for (const e of r.emails) { const k = normEmail(e); if (k) emailIndex.set(k, r.id); }
      for (const p of r.phones) { const k = normPhone(p); if (k.length >= 6) phoneIndex.set(k, r.id); }
    }

    for (const row of rows) {
      if (!row.name || !row.name.trim()) {
        dropped++;
        continue;
      }
      const emails = cleanArray(row.emails);
      const phones = cleanArray(row.phones);

      let matchId: number | null = null;
      for (const e of emails) {
        const id = emailIndex.get(normEmail(e));
        if (id) { matchId = id; break; }
      }
      if (matchId === null) {
        for (const p of phones) {
          const k = normPhone(p);
          if (k.length < 6) continue;
          const id = phoneIndex.get(k);
          if (id) { matchId = id; break; }
        }
      }

      try {
        if (matchId !== null) {
          const existingEntity = await this.repository.findById(matchId);
          if (!existingEntity) throw new Error('Matched contact not found');
          const existing = entityToContact(existingEntity);
          const mergedEmails = unionArrays(existing.emails, emails);
          const mergedPhones = unionArrays(existing.phones, phones);
          await this.repository.update(
            matchId,
            {
              company: row.company?.trim() ? clip(row.company.trim(), 'company') : undefined,
              country: row.country?.trim() ? clip(row.country.trim(), 'country') : undefined,
              linkedin: row.linkedin?.trim() ? clip(row.linkedin.trim(), 'linkedin') : undefined,
              instagram: row.instagram?.trim() ? clip(row.instagram.trim(), 'instagram') : undefined,
              sector: row.sector?.trim() ? clip(row.sector.trim(), 'sector') : undefined,
              stage: row.stage?.trim() ? clip(row.stage.trim(), 'stage') : undefined,
              notes: row.notes?.trim()
                ? (existing.notes ? `${existing.notes}\n${row.notes.trim()}` : row.notes.trim())
                : undefined,
              types: unionArrays(existing.types, cleanArray(row.types)),
              cities: unionArrays(existing.cities, cleanArray(row.cities)),
              emails: mergedEmails,
              phones: mergedPhones,
              tags: unionArrays(existing.tags, cleanArray(row.tags)),
            },
            actor
          );
          updated++;
          mergedEmails.forEach((e) => emailIndex.set(normEmail(e), matchId as number));
          mergedPhones.forEach((p) => { const k = normPhone(p); if (k.length >= 6) phoneIndex.set(k, matchId as number); });
        } else {
          const created = await this.repository.create(
            {
              name: clip(row.name.trim(), 'name'),
              company: clip(row.company?.trim() || '', 'company'),
              types: cleanArray(row.types),
              cities: cleanArray(row.cities),
              country: clip(row.country?.trim() || '', 'country'),
              emails,
              phones,
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
          emails.forEach((e) => emailIndex.set(normEmail(e), created.id));
          phones.forEach((p) => { const k = normPhone(p); if (k.length >= 6) phoneIndex.set(k, created.id); });
        }
      } catch (error) {
        console.error('Error importing contact row:', row.name, error);
        dropped++;
      }
    }
    return { imported, updated, dropped };
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
