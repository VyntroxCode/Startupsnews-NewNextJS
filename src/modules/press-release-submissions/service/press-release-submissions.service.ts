import { randomUUID } from 'crypto';
import { PressReleaseSubmissionsRepository } from '../repository/press-release-submissions.repository';
import {
  PressReleaseSubmission,
  PressReleaseSubmissionEntity,
  PressReleaseSubmissionInput,
  PressReleaseValidationError,
} from '../domain/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;
/** The composed "+<code> <digits>" string the public form builds. The per-country digit rules are
 * enforced in the browser (PhoneField + validatePhone); this is the server's backstop that the
 * value is at least that shape. */
const PHONE_RE = /^\+\d{1,4} \d{6,15}$/;

const MAX_LEN: Record<keyof PressReleaseSubmissionInput, number> = {
  name: 255,
  companyName: 255,
  phone: 50,
  email: 255,
  website: 500,
  country: 120,
  city: 120,
};

const LABELS: Record<keyof PressReleaseSubmissionInput, string> = {
  name: 'Name',
  companyName: 'Company name',
  phone: 'Phone',
  email: 'Email',
  website: 'Website',
  country: 'Country',
  city: 'City',
};

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function entityToSubmission(e: PressReleaseSubmissionEntity): PressReleaseSubmission {
  return {
    id: e.id,
    name: e.name || '',
    companyName: e.company_name || '',
    phone: e.phone || '',
    email: e.email || '',
    website: e.website || '',
    country: e.country || '',
    city: e.city || '',
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}

/** One rule set for both writers (the public form and an admin edit), so a row an admin saves is
 * held to exactly what a founder had to meet. */
export function normalizeSubmissionInput(raw: unknown): PressReleaseSubmissionInput {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const input: PressReleaseSubmissionInput = {
    name: str(body.name),
    companyName: str(body.companyName),
    phone: str(body.phone).replace(/\s+/g, ' '),
    email: str(body.email),
    website: str(body.website),
    country: str(body.country),
    city: str(body.city),
  };

  const missing = (['name', 'companyName', 'phone', 'email'] as const).filter((k) => !input[k]);
  if (missing.length) {
    throw new PressReleaseValidationError(`Please fill the required fields: ${missing.map((k) => LABELS[k]).join(', ')}.`);
  }
  for (const key of Object.keys(MAX_LEN) as (keyof PressReleaseSubmissionInput)[]) {
    if (input[key].length > MAX_LEN[key]) throw new PressReleaseValidationError(`${LABELS[key]} is too long.`);
  }
  if (!PHONE_RE.test(input.phone)) throw new PressReleaseValidationError('Enter a valid phone number with its country code.');
  if (!EMAIL_RE.test(input.email)) throw new PressReleaseValidationError('Enter a valid email address.');
  if (input.website && !URL_RE.test(input.website)) {
    throw new PressReleaseValidationError('Enter a valid website URL (e.g. https://yourstartup.com).');
  }
  return input;
}

export class PressReleaseSubmissionsService {
  constructor(private repository: PressReleaseSubmissionsRepository) {}

  async getAll(): Promise<PressReleaseSubmission[]> {
    const rows = await this.repository.findAll();
    return rows.map(entityToSubmission);
  }

  async create(raw: unknown): Promise<PressReleaseSubmission> {
    const input = normalizeSubmissionInput(raw);
    const id = `pr_${randomUUID()}`;
    await this.repository.insert(id, input);
    const saved = await this.repository.findById(id);
    if (!saved) throw new Error('Submission saved but could not be reloaded');
    return entityToSubmission(saved);
  }

  async update(id: string, raw: unknown): Promise<PressReleaseSubmission> {
    if (!id) throw new PressReleaseValidationError('Submission id is required.');
    const existing = await this.repository.findById(id);
    if (!existing) throw new PressReleaseValidationError('This submission no longer exists.');
    const input = normalizeSubmissionInput(raw);
    await this.repository.update(id, input);
    const saved = await this.repository.findById(id);
    if (!saved) throw new Error('Submission updated but could not be reloaded');
    return entityToSubmission(saved);
  }
}
