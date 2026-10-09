import { randomUUID } from 'crypto';
import {
  EnsTravelValidationError,
  type EnsTravelEnquiry,
  type EnsTravelEnquiryAdminInput,
  type EnsTravelEnquiryEntity,
  type EnsTravelEnquiryInput,
} from '../domain/types';
import { isParticipationValue, PARTICIPATION_OTHERS, REQUIREMENT_MAX_LENGTH } from '../domain/participation';
import { FOUND_US_DETAIL_MAX_LENGTH, FOUND_US_OTHERS, isFoundUsValue, isReferredByValue, type ReferredByValue } from '../domain/sources';
import { CONVERSATION_NOTE_MAX_LENGTH, type EnsLeadStatus, isLeadStatus, leadStatusTakesNote } from '../domain/lead-status';
import type { EnsTravelEnquiriesRepository } from '../repository/ens-travel-enquiries.repository';
import { statusFromEns } from '@/modules/lead-assignments/domain/types';
import { STATUS_CHANGE_FIELD } from '@/modules/lead-followups/domain/types';
import { ensEnquiryChanges } from '@/modules/lead-followups/service/lead-changes';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { isIsoDay, statusNeedsFollowUpDate } from '@/modules/lead-followups/domain/follow-up-date';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The "+<code> <digits>" (or bare digits) the form composes. Per-country digit rules are enforced
 * in the browser; this is only the server's backstop on shape. */
const CONTACT_RE = /^\+?[\d\s-]{6,24}$/;

const MAX_LEN = { name: 120, email: 160, contact: 24, city: 120, country: 120 } as const;

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toText(value: string | Date | null | undefined): string {
  if (!value) return '';
  return value instanceof Date ? value.toISOString() : String(value);
}

export function entityToEnquiry(e: EnsTravelEnquiryEntity): EnsTravelEnquiry {
  return {
    id: e.id,
    name: e.name || '',
    email: e.email || '',
    contact: e.contact || '',
    city: e.city || '',
    country: e.country || '',
    participation: (isParticipationValue(e.participation) ? e.participation : 'others'),
    requirement: e.requirement || '',
    referredBy: e.referred_by && isReferredByValue(e.referred_by) ? e.referred_by : '',
    // A row from before the source fields existed has no channel; it reads as "others" with no
    // detail rather than crashing the type, and an admin edit will ask for one.
    foundUs: e.found_us && isFoundUsValue(e.found_us) ? e.found_us : FOUND_US_OTHERS,
    foundUsDetail: e.found_us === FOUND_US_OTHERS ? e.found_us_detail || '' : '',
    leadStatus: e.lead_status && isLeadStatus(e.lead_status) ? e.lead_status : null,
    conversationNote: leadStatusTakesNote(e.lead_status) ? e.conversation_note || '' : '',
    nextFollowUpDate: e.next_follow_up_date ? String(e.next_follow_up_date).slice(0, 10) : '',
    createdAt: toText(e.created_at),
    updatedAt: e.updated_at ? toText(e.updated_at) : null,
    updatedBy: e.updated_by || '',
  };
}

/** Turns a raw body — from the public form or from the admin edit — into the fields to store, or
 * throws the message the person should see. One set of rules for both, so an admin can never save
 * an enquiry the form itself would have refused. */
export function normalizeEnquiryInput(body: Record<string, unknown>): EnsTravelEnquiryInput {
  const name = str(body.name);
  const email = str(body.email);
  const contact = str(body.contact);
  const city = str(body.city);
  const country = str(body.country);

  if (!name) throw new EnsTravelValidationError('Please enter your full name.');
  if (!email) throw new EnsTravelValidationError('Please enter your email address.');
  if (!EMAIL_RE.test(email)) throw new EnsTravelValidationError('Please enter a valid email address.');
  if (!contact) throw new EnsTravelValidationError('Please enter your contact number.');
  if (!CONTACT_RE.test(contact)) throw new EnsTravelValidationError('Please enter a valid contact number.');
  if (!country) throw new EnsTravelValidationError('Please select your country.');

  for (const [field, max] of Object.entries(MAX_LEN)) {
    const value = { name, email, contact, city, country }[field as keyof typeof MAX_LEN];
    if (value.length > max) throw new EnsTravelValidationError(`That ${field} is too long (max ${max} characters).`);
  }

  const participation = str(body.participation);
  if (!participation) throw new EnsTravelValidationError('Please select how you are participating.');
  if (!isParticipationValue(participation)) {
    throw new EnsTravelValidationError('Please select one of the listed participation options.');
  }

  // Only "Others" carries a requirement; anything sent alongside another option is dropped rather
  // than stored against a package it doesn't describe.
  const requirement = participation === PARTICIPATION_OTHERS ? str(body.requirement) : '';
  if (participation === PARTICIPATION_OTHERS && !requirement) {
    throw new EnsTravelValidationError('Please describe your requirement.');
  }
  if (requirement.length > REQUIREMENT_MAX_LENGTH) {
    throw new EnsTravelValidationError(`Please keep your requirement under ${REQUIREMENT_MAX_LENGTH} characters.`);
  }

  // Optional: an empty referrer is the common case. A value that is sent must be a listed partner.
  const rawReferredBy = str(body.referredBy);
  if (rawReferredBy && !isReferredByValue(rawReferredBy)) {
    throw new EnsTravelValidationError('Please select one of the listed referrers.');
  }
  const referredBy = rawReferredBy as ReferredByValue | '';

  const foundUs = str(body.foundUs);
  if (!foundUs) throw new EnsTravelValidationError('Please tell us how you found us.');
  if (!isFoundUsValue(foundUs)) throw new EnsTravelValidationError('Please select one of the listed options for how you found us.');

  // As with `requirement`: only "Others" carries the visitor's own words.
  const foundUsDetail = foundUs === FOUND_US_OTHERS ? str(body.foundUsDetail) : '';
  if (foundUs === FOUND_US_OTHERS && !foundUsDetail) {
    throw new EnsTravelValidationError('Please tell us where you found us.');
  }
  if (foundUsDetail.length > FOUND_US_DETAIL_MAX_LENGTH) {
    throw new EnsTravelValidationError(`Please keep that under ${FOUND_US_DETAIL_MAX_LENGTH} characters.`);
  }

  return { name, email, contact, city, country, participation, requirement, referredBy, foundUs, foundUsDetail };
}

/** The admin-only part of an edit: the lead status, under "Confirmed" / "Follow Up" the conversation
 * note, and the admin's next follow-up date.
 * An empty status means "no conversation yet" and clears the note; a note sent with any other
 * status is dropped rather than stored against a status it doesn't describe.
 * The date is compulsory while the enquiry is open (no status = Pending, or Follow Up). Once it is
 * closed none is asked for; whatever is sent (a valid date or nothing) is stored as-is. */
export function normalizeLeadStatusInput(body: Record<string, unknown>): Pick<EnsTravelEnquiryAdminInput, 'leadStatus' | 'conversationNote' | 'nextFollowUpDate'> {
  const rawStatus = str(body.leadStatus);
  let leadStatus: EnsLeadStatus | null = null;
  if (rawStatus) {
    if (!isLeadStatus(rawStatus)) throw new EnsTravelValidationError('Please select one of the listed lead statuses.');
    leadStatus = rawStatus;
  }
  const conversationNote = leadStatusTakesNote(leadStatus) ? str(body.conversationNote) : '';
  if (conversationNote.length > CONVERSATION_NOTE_MAX_LENGTH) {
    throw new EnsTravelValidationError(`Please keep the conversation note under ${CONVERSATION_NOTE_MAX_LENGTH} characters.`);
  }
  const nextFollowUpDate = str(body.nextFollowUpDate);
  if (nextFollowUpDate && !isIsoDay(nextFollowUpDate)) throw new EnsTravelValidationError('Please pick a valid next follow-up date.');
  if (!nextFollowUpDate && statusNeedsFollowUpDate(statusFromEns(leadStatus))) {
    throw new EnsTravelValidationError('Please pick the next follow-up date.');
  }
  return { leadStatus, conversationNote, nextFollowUpDate };
}

export class EnsTravelEnquiryNotFoundError extends Error {
  constructor() {
    super('Enquiry not found');
    this.name = 'EnsTravelEnquiryNotFoundError';
  }
}

/** Every enquiry lives in `ens_travel_enquiries` only — its own table, read by the Sales Tracker's
 * "Expand North Star enquiries" card. Nothing is written to `sales_leads`, so these never appear in
 * All leads alongside the other pages' leads. */
export class EnsTravelEnquiriesService {
  constructor(private repository: EnsTravelEnquiriesRepository) {}

  async getAll(): Promise<EnsTravelEnquiry[]> {
    const rows = await this.repository.findAll();
    return rows.map(entityToEnquiry);
  }

  async getById(id: string): Promise<EnsTravelEnquiry | null> {
    const row = await this.repository.findById(id);
    return row ? entityToEnquiry(row) : null;
  }

  async create(body: Record<string, unknown>): Promise<EnsTravelEnquiry> {
    const input = normalizeEnquiryInput(body);
    // "ens_" + a 36-char UUID = 40 chars: exactly sales_leads.id (VARCHAR(40)), which the mirrored
    // lead reuses so the two rows stay 1:1.
    const id = `ens_${randomUUID()}`;
    await this.repository.insert(id, input);
    const saved = await this.repository.findById(id);
    if (!saved) throw new Error('Enquiry saved but could not be reloaded');
    return entityToEnquiry(saved);
  }

  /** An admin edit: the visitor's fields plus the lead status / conversation note / next follow-up
   * date. Returns the stored enquiry with its new `updatedAt` / `updatedBy`. */
  async update(id: string, body: Record<string, unknown>, updatedBy: string): Promise<EnsTravelEnquiry> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new EnsTravelEnquiryNotFoundError();
    const input: EnsTravelEnquiryAdminInput = { ...normalizeEnquiryInput(body), ...normalizeLeadStatusInput(body) };
    await this.repository.update(id, input, updatedBy);
    const saved = await this.repository.findById(id);
    if (!saved) throw new EnsTravelEnquiryNotFoundError();
    // The lead's history (Lead activity in the Sales Tracker, the follow-up log in My Leads) gets
    // ONE entry for a save that changed anything: every changed field as old value → new value
    // (see lead-changes.ts), plus the conversation result as the entry's text when the status or
    // the result itself changed — the field only ever holds the latest text. Logged after the save;
    // if it fails the edit still stands.
    const before = entityToEnquiry(existing);
    const after = entityToEnquiry(saved);
    const changes = ensEnquiryChanges(before, after);
    const statusChanged = before.leadStatus !== after.leadStatus;
    const note = statusChanged || before.conversationNote !== after.conversationNote ? after.conversationNote : '';
    if (note || changes.length) {
      const status = statusFromEns(after.leadStatus);
      const dated = note || changes.some((c) => c.field === STATUS_CHANGE_FIELD || c.field === 'Next follow-up date');
      try {
        await new LeadFollowUpsRepository().addAdminUpdate(
          'ens', id, updatedBy || 'Admin', status, note,
          dated && statusNeedsFollowUpDate(status) ? after.nextFollowUpDate : '',
          changes
        );
      } catch (error) {
        console.error('Could not log the admin update on Expand North Star enquiry', id, error);
      }
    }
    return entityToEnquiry(saved);
  }
}
