import { randomUUID } from 'crypto';
import { SponsorEventSubmissionsRepository } from '../repository/sponsor-event-submissions.repository';
import {
  SponsorEventSubmission,
  SponsorEventSubmissionEntity,
  SponsorEventSubmissionInput,
  SponsorEventValidationError,
} from '../domain/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
/** The composed "+<code> <digits>" (or bare digits) the form builds. Per-country digit rules are
 * enforced in the browser; this is only the server's backstop on shape. */
const PHONE_RE = /^\+?[\d\s-]{6,49}$/;
/** The "Other (add manually)" sentinel the shared CountryCityFields control stores — see
 * components/submit-event/constants.ts (OTHER_COUNTRY_VALUE / OTHER_CITY_VALUE). */
const OTHER_VALUE = '__other__';

const MAX_LEN: Record<keyof SponsorEventSubmissionInput, number> = {
  eventTitle: 255,
  eventSlug: 255,
  location: 255,
  country: 120,
  city: 120,
  externalUrl: 1000,
  eventDate: 10,
  eventTime: 8,
  description: 5000,
  posterUrl: 1000,
  contactName: 255,
  contactEmail: 255,
  phone: 50,
};

const LABELS: Record<keyof SponsorEventSubmissionInput, string> = {
  eventTitle: 'Event title',
  eventSlug: 'Event URL',
  location: 'Location',
  country: 'Country',
  city: 'City',
  externalUrl: 'External URL',
  eventDate: 'Date',
  eventTime: 'Time',
  description: 'Description',
  posterUrl: 'Event poster',
  contactName: 'Your name',
  contactEmail: 'Your email',
  phone: 'Phone',
};

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return value ? String(value) : '';
}

function isHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function entityToSubmission(e: SponsorEventSubmissionEntity): SponsorEventSubmission {
  return {
    id: e.id,
    eventTitle: e.event_title || '',
    eventSlug: e.event_slug || '',
    location: e.location || '',
    country: e.country || '',
    city: e.city || '',
    externalUrl: e.external_url || '',
    eventDate: e.event_date || '',
    eventTime: e.event_time || '',
    description: e.description || '',
    posterUrl: e.poster_url || '',
    contactName: e.contact_name || '',
    contactEmail: e.contact_email || '',
    phone: e.phone || '',
    createdAt: toIso(e.created_at),
    updatedAt: toIso(e.updated_at),
  };
}

/** Accepts the /sponsor-event form's own payload shape (title, slug, date, time, contactName, …,
 * plus the structured country/countryOther/city/cityOther picks) so the public form did not have to
 * change. Required fields and messages match what the route enforced before it saved anything. */
export function normalizeSubmissionInput(raw: unknown): SponsorEventSubmissionInput {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const countryPick = str(body.country);
  const cityPick = str(body.city);
  const country = countryPick === OTHER_VALUE ? str(body.countryOther) : countryPick;
  const city = cityPick === OTHER_VALUE ? str(body.cityOther) : cityPick;

  const input: SponsorEventSubmissionInput = {
    eventTitle: str(body.title),
    eventSlug: str(body.slug),
    location: str(body.location) || [city, country].filter(Boolean).join(', '),
    country,
    city,
    externalUrl: str(body.externalUrl),
    eventDate: str(body.date),
    eventTime: str(body.time),
    description: str(body.description),
    posterUrl: str(body.posterUrl),
    contactName: str(body.contactName),
    contactEmail: str(body.contactEmail),
    phone: str(body.phone).replace(/\s+/g, ' '),
  };

  const required: [keyof SponsorEventSubmissionInput, string][] = [
    ['eventTitle', 'event title'],
    ['eventSlug', 'slug'],
    ['location', 'location'],
    ['eventDate', 'date'],
    ['eventTime', 'time'],
    ['description', 'description'],
    ['posterUrl', 'event poster'],
    ['contactName', 'your name'],
    ['contactEmail', 'your email'],
  ];
  const missing = required.filter(([key]) => !input[key]).map(([, label]) => label);
  if (missing.length) {
    throw new SponsorEventValidationError(`Please fill the following required fields: ${missing.join(', ')}.`);
  }
  for (const key of Object.keys(MAX_LEN) as (keyof SponsorEventSubmissionInput)[]) {
    if (input[key].length > MAX_LEN[key]) throw new SponsorEventValidationError(`${LABELS[key]} is too long.`);
  }
  if (!EMAIL_RE.test(input.contactEmail)) throw new SponsorEventValidationError('Enter a valid email address.');
  if (input.externalUrl && !isHttpUrl(input.externalUrl)) {
    throw new SponsorEventValidationError('Enter a valid http:// or https:// URL.');
  }
  if (!isHttpUrl(input.posterUrl)) throw new SponsorEventValidationError('The event poster upload is invalid. Please upload it again.');
  if (!DATE_RE.test(input.eventDate)) throw new SponsorEventValidationError('Enter a valid event date.');
  if (!TIME_RE.test(input.eventTime)) throw new SponsorEventValidationError('Enter a valid event time.');
  if (input.phone && !PHONE_RE.test(input.phone)) throw new SponsorEventValidationError('Enter a valid phone number.');
  return input;
}

export class SponsorEventSubmissionsService {
  constructor(private repository: SponsorEventSubmissionsRepository) {}

  async getAll(): Promise<SponsorEventSubmission[]> {
    const rows = await this.repository.findAll();
    return rows.map(entityToSubmission);
  }

  async create(raw: unknown): Promise<SponsorEventSubmission> {
    const input = normalizeSubmissionInput(raw);
    // "se_" + a 36-char UUID = 39 chars: fits sales_leads.id (VARCHAR(40)), which the mirrored lead
    // reuses so the two rows stay 1:1.
    const id = `se_${randomUUID()}`;
    await this.repository.insert(id, input);
    const saved = await this.repository.findById(id);
    if (!saved) throw new Error('Submission saved but could not be reloaded');
    return entityToSubmission(saved);
  }
}
