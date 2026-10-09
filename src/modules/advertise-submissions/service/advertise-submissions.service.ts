import { randomUUID } from 'crypto';
import { AdvertiseSubmissionsRepository } from '../repository/advertise-submissions.repository';
import {
  AdvertiseSubmission,
  AdvertiseSubmissionEntity,
  AdvertiseSubmissionInput,
  AdvertiseValidationError,
} from '../domain/types';
import { validateBudgetRange } from '../domain/budget';
import { TELL_US_MORE_MAX_LENGTH } from '@/modules/sales-tracker/domain/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The composed "+<code> <digits>" string the public form builds. The per-country digit rules are
 * enforced in the browser (PhoneField + validatePhone); this is the server's backstop that the
 * value is at least that shape. */
const PHONE_RE = /^\+\d{1,4} \d{6,15}$/;

/** Budget range is not here: validateBudgetRange carries its own length rule. */
const MAX_LEN: Partial<Record<keyof AdvertiseSubmissionInput, number>> = {
  name: 255,
  companyName: 255,
  phone: 50,
  email: 255,
  country: 120,
  city: 120,
  campaignGoal: 255,
  tellUsMore: TELL_US_MORE_MAX_LENGTH,
};

const LABELS: Record<keyof AdvertiseSubmissionInput, string> = {
  name: 'Name',
  companyName: 'Company name',
  phone: 'Phone',
  email: 'Email',
  country: 'Country',
  city: 'City',
  budgetRange: 'Budget range',
  campaignGoal: 'Campaign goal',
  tellUsMore: 'Tell us more',
};

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function entityToSubmission(e: AdvertiseSubmissionEntity): AdvertiseSubmission {
  return {
    id: e.id,
    name: e.name || '',
    companyName: e.company_name || '',
    phone: e.phone || '',
    email: e.email || '',
    country: e.country || '',
    city: e.city || '',
    budgetRange: e.budget_range || '',
    campaignGoal: e.campaign_goal || '',
    tellUsMore: e.tell_us_more || '',
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}

/** Everything is required except City and "Tell us more". */
export function normalizeSubmissionInput(raw: unknown): AdvertiseSubmissionInput {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const input: AdvertiseSubmissionInput = {
    name: str(body.name),
    companyName: str(body.companyName),
    phone: str(body.phone).replace(/\s+/g, ' '),
    email: str(body.email),
    country: str(body.country),
    city: str(body.city),
    budgetRange: str(body.budgetRange).replace(/\s+/g, ' '),
    campaignGoal: str(body.campaignGoal),
    // Optional. Trimmed at the ends only, so the line breaks the visitor typed are kept.
    tellUsMore: str(body.tellUsMore),
  };

  const missing = (['name', 'companyName', 'email', 'phone', 'country', 'budgetRange', 'campaignGoal'] as const).filter((k) => !input[k]);
  if (missing.length) {
    throw new AdvertiseValidationError(`Please fill the required fields: ${missing.map((k) => LABELS[k]).join(', ')}.`);
  }
  for (const key of Object.keys(MAX_LEN) as (keyof AdvertiseSubmissionInput)[]) {
    if (input[key].length > (MAX_LEN[key] as number)) throw new AdvertiseValidationError(`${LABELS[key]} is too long.`);
  }
  if (!PHONE_RE.test(input.phone)) throw new AdvertiseValidationError('Enter a valid phone number with its country code.');
  if (!EMAIL_RE.test(input.email)) throw new AdvertiseValidationError('Enter a valid email address.');
  const budgetProblem = validateBudgetRange(input.budgetRange);
  if (budgetProblem) throw new AdvertiseValidationError(budgetProblem);
  return input;
}

export class AdvertiseSubmissionsService {
  constructor(private repository: AdvertiseSubmissionsRepository) {}

  async getAll(): Promise<AdvertiseSubmission[]> {
    const rows = await this.repository.findAll();
    return rows.map(entityToSubmission);
  }

  async create(raw: unknown): Promise<AdvertiseSubmission> {
    const input = normalizeSubmissionInput(raw);
    const id = `adv_${randomUUID()}`;
    await this.repository.insert(id, input);
    const saved = await this.repository.findById(id);
    if (!saved) throw new Error('Submission saved but could not be reloaded');
    return entityToSubmission(saved);
  }
}
