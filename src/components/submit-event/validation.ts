import { CUSTOM_CODE_RE, EMAIL_RE, OTHER_CITY_VALUE, PHONE_RULES, SLUG_RE } from './constants';
import type { SubmitEventFormData } from './types';

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function resolvedCity(data: SubmitEventFormData): string {
  return data.city === OTHER_CITY_VALUE ? data.cityOther.trim() : data.city;
}

export function resolvedPhoneCode(data: SubmitEventFormData): string {
  if (data.phoneCode === 'other') return data.phoneCodeCustom.trim() || 'other';
  return data.phoneCode;
}

export function resolveEndDateTime(data: SubmitEventFormData): { endDate: string; endTime: string } {
  return {
    endDate: data.endDate || data.startDate,
    endTime: data.endTime || '23:59',
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

export function validateSlug(data: SubmitEventFormData): string {
  const v = data.slug.trim();
  if (!v) return 'Please enter a slug.';
  if (!SLUG_RE.test(v)) return 'Slug can only contain lowercase letters, numbers, and hyphens (e.g. my-event-name).';
  return '';
}

export function validateExternalUrl(data: SubmitEventFormData): string {
  const v = data.externalUrl.trim();
  if (!v) return '';
  return isValidHttpUrl(v) ? '' : 'Enter a valid http:// or https:// URL.';
}

export function validateCountry(data: SubmitEventFormData): string {
  return data.country ? '' : 'Please select a country.';
}

export function validateCity(data: SubmitEventFormData): string {
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

export function validateEndTime(data: SubmitEventFormData): string {
  if (data.endTime && data.startDate && data.startTime) {
    const startDT = new Date(`${data.startDate}T${data.startTime}`);
    const endDateVal = data.endDate || data.startDate;
    const endDT = new Date(`${endDateVal}T${data.endTime}`);
    if (endDT < startDT) return 'End date/time must not be before the start date/time.';
  }
  return '';
}

export function validateDescription(data: SubmitEventFormData): string {
  return data.description.trim() ? '' : 'Please add a description.';
}

export function validateVenueAddress(data: SubmitEventFormData): string {
  return data.venueAddress.trim() ? '' : 'Please add the venue address.';
}

export function validateVenueMapLink(data: SubmitEventFormData): string {
  const v = data.venueMapLink.trim();
  if (!v) return 'Please add the Google Maps location link.';
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
export const STEP_2_VALIDATORS = [validateTitle, validateSlug, validateCountry, validateCity, validateExternalUrl, validateDescription] as const;
export const STEP_3_VALIDATORS = [validateStartDate, validateStartTime, validateEndTime, validateVenueAddress, validateVenueMapLink, validateSpeakers] as const;
export const STEP_4_VALIDATORS = [validateImage1] as const;

export const FIELD_NAMES = {
  organizerName: 'organizerName',
  organizerOrg: 'organizerOrg',
  organizerEmail: 'organizerEmail',
  organizerPhone: 'organizerPhone',
  title: 'title',
  slug: 'slug',
  country: 'country',
  city: 'city',
  externalUrl: 'externalUrl',
  description: 'description',
  startDate: 'startDate',
  startTime: 'startTime',
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
  2: [
    { field: FIELD_NAMES.title, fn: validateTitle },
    { field: FIELD_NAMES.slug, fn: validateSlug },
    { field: FIELD_NAMES.country, fn: validateCountry },
    { field: FIELD_NAMES.city, fn: validateCity },
    { field: FIELD_NAMES.externalUrl, fn: validateExternalUrl },
    { field: FIELD_NAMES.description, fn: validateDescription },
  ],
  3: [
    { field: FIELD_NAMES.startDate, fn: validateStartDate },
    { field: FIELD_NAMES.startTime, fn: validateStartTime },
    { field: FIELD_NAMES.endTime, fn: validateEndTime },
    { field: FIELD_NAMES.venueAddress, fn: validateVenueAddress },
    { field: FIELD_NAMES.venueMapLink, fn: validateVenueMapLink },
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
