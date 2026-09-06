import {
  CUSTOM_CODE_RE,
  EMAIL_RE,
  ONLINE_PARTNERSHIP_TYPE,
  OTHER_CITY_VALUE,
  OTHER_COUNTRY_VALUE,
  PHONE_RULES,
} from './constants';
import type { SubmitEventFormData } from './types';
import { resolveDefaultEndTime } from '@/modules/event-submission/domain/types';

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** An online (virtual) event has no venue city/country to pick, so those two selects are locked
 * and pre-filled rather than left for the organiser to answer. */
export function isOnlineEvent(data: SubmitEventFormData): boolean {
  return data.eventType === ONLINE_PARTNERSHIP_TYPE;
}

export function resolvedCity(data: SubmitEventFormData): string {
  return data.city === OTHER_CITY_VALUE ? data.cityOther.trim() : data.city;
}

export function resolvedCountry(data: SubmitEventFormData): string {
  return data.country === OTHER_COUNTRY_VALUE ? data.countryOther.trim() : data.country;
}

export function resolvedPhoneCode(data: SubmitEventFormData): string {
  if (data.phoneCode === 'other') return data.phoneCodeCustom.trim() || 'other';
  return data.phoneCode;
}

export function resolveEndDateTime(data: SubmitEventFormData): { endDate: string; endTime: string } {
  const endDate = data.endDate || data.startDate;
  return {
    endDate,
    endTime: data.endTime || resolveDefaultEndTime(data.startTime, endDate === data.startDate),
  };
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

export function validateOrganizerName(data: SubmitEventFormData): string {
  return data.organizerName.trim() ? '' : 'Please enter the organizer name.';
}

export function validateOrganizerOrg(data: SubmitEventFormData): string {
  return data.organizerOrg.trim() ? '' : 'Please enter the company name.';
}

export function validateEmail(data: SubmitEventFormData): string {
  const v = data.organizerEmail.trim();
  if (!v) return 'Please enter a contact email.';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address.';
  return '';
}

export function validatePhone(data: SubmitEventFormData): string {
  if (data.phoneCode === 'other' && !CUSTOM_CODE_RE.test(data.phoneCodeCustom.trim())) {
    return 'Enter a valid country code (e.g. +123).';
  }
  const digits = data.phoneNumber.replace(/\D/g, '');
  const code = resolvedPhoneCode(data);
  const rule = PHONE_RULES[code] || PHONE_RULES.other;
  if (!digits) return 'Contact phone is required.';
  if (!rule.pattern.test(digits)) return rule.message;
  return '';
}

export function validateTitle(data: SubmitEventFormData): string {
  return data.title.trim() ? '' : 'Please enter an event title.';
}

export function validateExternalUrl(data: SubmitEventFormData): string {
  const v = data.externalUrl.trim();
  if (!v) return 'Please enter a registration link.';
  return isValidHttpUrl(v) ? '' : 'Enter a valid http:// or https:// URL.';
}

export function validateCountry(data: SubmitEventFormData): string {
  if (isOnlineEvent(data)) return '';
  if (data.country === OTHER_COUNTRY_VALUE) {
    return data.countryOther.trim() ? '' : 'Please enter a country name.';
  }
  return data.country && data.country !== OTHER_COUNTRY_VALUE ? '' : 'Please select a country.';
}

export function validateCity(data: SubmitEventFormData): string {
  if (isOnlineEvent(data)) return '';
  if (data.city === OTHER_CITY_VALUE) {
    return data.cityOther.trim() ? '' : 'Please enter a city name.';
  }
  return data.city && data.city !== OTHER_CITY_VALUE ? '' : 'Please select a city.';
}

export function validateStartDate(data: SubmitEventFormData): string {
  if (!data.startDate) return 'Please select a start date.';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chosen = new Date(data.startDate + 'T00:00:00');
  if (chosen < today) return 'Start date cannot be in the past.';
  return '';
}

export function validateStartTime(data: SubmitEventFormData): string {
  return data.startTime ? '' : 'Please select a start time.';
}

/**
 * The two end-of-event checks are split by FIELD so each error lands under the input that is
 * actually wrong, and they are kept non-overlapping so one mistake never lights up both:
 * validateEndDate owns a different day, validateEndTime owns the same day.
 *
 * Both compare the values the submission will really store (resolveEndDateTime: a blank end date
 * means the start date, a blank end time means DEFAULT_END_TIME) — the previous single validator only ran
 * `if (data.endTime && ...)`, so an end date BEFORE the start date with no end time set passed
 * unchecked on both the client and the API.
 *
 * ISO strings are compared directly rather than via `new Date()`: 'YYYY-MM-DD' and 'HH:MM' both
 * sort lexicographically, and an unparseable value here would otherwise become `Invalid Date`,
 * whose comparisons are all false — i.e. it would silently pass rather than fail.
 */
export function validateEndDate(data: SubmitEventFormData): string {
  if (!data.startDate || !data.endDate) return '';
  return data.endDate < data.startDate ? 'End date cannot be before the start date.' : '';
}

export function validateEndTime(data: SubmitEventFormData): string {
  if (!data.startDate || !data.startTime) return '';
  const { endDate, endTime } = resolveEndDateTime(data);
  // A different day is validateEndDate's business — checking it here too would show the same
  // mistake twice, under two fields.
  if (endDate !== data.startDate) return '';
  return endTime < data.startTime ? 'End time must not be before the start time.' : '';
}

export function validateDescription(data: SubmitEventFormData): string {
  return data.description.trim() ? '' : 'Please add a description.';
}

/** An online event has no street address, so the venue pair is optional there — but a value that
 * IS typed still has to be a real URL. Mirrors EventSubmissionService.validate() exactly; if the
 * two ever disagree the form will happily submit something the API answers with a 400. */
export function validateVenueAddress(data: SubmitEventFormData): string {
  if (isOnlineEvent(data)) return '';
  return data.venueAddress.trim() ? '' : 'Please add the venue address.';
}

export function validateVenueMapLink(data: SubmitEventFormData): string {
  const v = data.venueMapLink.trim();
  if (!v) return isOnlineEvent(data) ? '' : 'Please add the Google Maps location link.';
  return isValidHttpUrl(v) ? '' : 'Enter a valid URL (e.g. https://maps.google.com/...).';
}

export function validateSpeakers(data: SubmitEventFormData): string {
  const missingIdx = data.speakers.findIndex((s) => !s.name.trim());
  return missingIdx === -1 ? '' : `Speaker/guest #${missingIdx + 1}: Name is required (or remove that row).`;
}

export function validateImage1(data: SubmitEventFormData): string {
  return data.image1 ? '' : 'Please add a cover image (upload or link).';
}

export const STEP_1_VALIDATORS = [validateOrganizerName, validateOrganizerOrg, validateEmail, validatePhone] as const;
export const STEP_2_VALIDATORS = [validateTitle, validateCountry, validateCity, validateVenueAddress, validateVenueMapLink, validateExternalUrl] as const;
export const STEP_3_VALIDATORS = [validateStartDate, validateStartTime, validateEndDate, validateEndTime, validateDescription, validateSpeakers] as const;
export const STEP_4_VALIDATORS = [validateImage1] as const;

export const FIELD_NAMES = {
  organizerName: 'organizerName',
  organizerOrg: 'organizerOrg',
  organizerEmail: 'organizerEmail',
  organizerPhone: 'organizerPhone',
  title: 'title',
  country: 'country',
  city: 'city',
  externalUrl: 'externalUrl',
  description: 'description',
  startDate: 'startDate',
  startTime: 'startTime',
  endDate: 'endDate',
  endTime: 'endTime',
  venueAddress: 'venueAddress',
  venueMapLink: 'venueMapLink',
  speakers: 'speakers',
  image1: 'image1',
} as const;

const STEP_VALIDATOR_MAP: Record<number, { field: string; fn: (data: SubmitEventFormData) => string }[]> = {
  1: [
    { field: FIELD_NAMES.organizerName, fn: validateOrganizerName },
    { field: FIELD_NAMES.organizerOrg, fn: validateOrganizerOrg },
    { field: FIELD_NAMES.organizerEmail, fn: validateEmail },
    { field: FIELD_NAMES.organizerPhone, fn: validatePhone },
  ],
  // Slug is no longer a visible field (auto-derived from the title), so it is not validated here —
  // an error on a hidden field would block Next with nothing on screen to fix.
  2: [
    { field: FIELD_NAMES.title, fn: validateTitle },
    { field: FIELD_NAMES.country, fn: validateCountry },
    { field: FIELD_NAMES.city, fn: validateCity },
    { field: FIELD_NAMES.venueAddress, fn: validateVenueAddress },
    { field: FIELD_NAMES.venueMapLink, fn: validateVenueMapLink },
    { field: FIELD_NAMES.externalUrl, fn: validateExternalUrl },
  ],
  3: [
    { field: FIELD_NAMES.startDate, fn: validateStartDate },
    { field: FIELD_NAMES.startTime, fn: validateStartTime },
    { field: FIELD_NAMES.endDate, fn: validateEndDate },
    { field: FIELD_NAMES.endTime, fn: validateEndTime },
    { field: FIELD_NAMES.description, fn: validateDescription },
    { field: FIELD_NAMES.speakers, fn: validateSpeakers },
  ],
  4: [{ field: FIELD_NAMES.image1, fn: validateImage1 }],
};

/** Runs every validator for a step, returns a partial FieldErrors map (only non-empty messages included is up to caller). */
export function validateStep(step: number, data: SubmitEventFormData): Record<string, string> {
  const entries = STEP_VALIDATOR_MAP[step] || [];
  const errors: Record<string, string> = {};
  for (const { field, fn } of entries) {
    errors[field] = fn(data);
  }
  return errors;
}

export function stepHasErrors(errors: Record<string, string>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Validates steps 1-4 (Review has no fields of its own) and returns merged errors plus the first step that failed. */
export function validateAllSteps(data: SubmitEventFormData): { errors: Record<string, string>; firstInvalidStep: number | null } {
  const errors: Record<string, string> = {};
  let firstInvalidStep: number | null = null;
  for (const step of [1, 2, 3, 4]) {
    const stepErrors = validateStep(step, data);
    Object.assign(errors, stepErrors);
    if (firstInvalidStep === null && stepHasErrors(stepErrors)) firstInvalidStep = step;
  }
  return { errors, firstInvalidStep };
}
