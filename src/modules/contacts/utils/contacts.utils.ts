import { Contact, ContactEntity } from '../domain/types';

export function parseArray(value: unknown): string[] {
  if (!value) return [];
  // The `mariadb` driver may return JSON columns as an already-parsed array, a raw
  // JSON string, or a Buffer (when the connection isn't in string mode) — handle all three.
  let parsed: unknown = value;
  if (Buffer.isBuffer(value)) parsed = safeJsonParse(value.toString('utf8'));
  else if (typeof value === 'string') parsed = safeJsonParse(value);
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : [];
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function entityToContact(entity: ContactEntity): Contact {
  return {
    id: entity.id,
    name: entity.name,
    company: entity.company || '',
    types: parseArray(entity.types),
    cities: parseArray(entity.cities),
    country: entity.country || '',
    emails: parseArray(entity.emails),
    phones: parseArray(entity.phones),
    linkedin: entity.linkedin || '',
    instagram: entity.instagram || '',
    sector: entity.sector || '',
    stage: entity.stage || '',
    tags: parseArray(entity.tags),
    notes: entity.notes || '',
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

export const CONTACT_EXPORT_COLUMNS = [
  'Name', 'Company', 'Types', 'Cities', 'Country', 'Emails', 'Phones',
  'LinkedIn', 'Instagram', 'Sector', 'Stage', 'Tags', 'Notes',
] as const;

export function contactToExportRow(c: Contact): Record<(typeof CONTACT_EXPORT_COLUMNS)[number], string> {
  return {
    Name: c.name,
    Company: c.company,
    Types: c.types.join('; '),
    Cities: c.cities.join('; '),
    Country: c.country,
    Emails: c.emails.join('; '),
    Phones: c.phones.join('; '),
    LinkedIn: c.linkedin,
    Instagram: c.instagram,
    Sector: c.sector,
    Stage: c.stage,
    Tags: c.tags.join('; '),
    Notes: c.notes,
  };
}
