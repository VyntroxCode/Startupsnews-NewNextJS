import { SLUG_RE, EMAIL_RE } from "@/components/submit-event/constants";
import type { SponsorEventFormData } from "./types";

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

export function validateTitle(data: SponsorEventFormData): string {
  return data.title.trim() ? "" : "Please enter the event title.";
}

export function validateSlug(data: SponsorEventFormData): string {
  const v = data.slug.trim();
  if (!v) return "Please enter a slug.";
  return SLUG_RE.test(v) ? "" : "Use lowercase letters, numbers, and hyphens only (e.g. my-event-2026).";
}

export function validateLocation(data: SponsorEventFormData): string {
  return data.location.trim() ? "" : "Please enter the event's city and country.";
}

export function validateExternalUrl(data: SponsorEventFormData): string {
  const v = data.externalUrl.trim();
  if (!v) return "";
  return isValidHttpUrl(v) ? "" : "Enter a valid http:// or https:// URL.";
}

export function validateDate(data: SponsorEventFormData): string {
  if (!data.date) return "Please select the event date.";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chosen = new Date(data.date + "T00:00:00");
  return chosen < today ? "Event date cannot be in the past." : "";
}

export function validateTime(data: SponsorEventFormData): string {
  return data.time ? "" : "Please select the event time.";
}

export function validateDescription(data: SponsorEventFormData): string {
  return data.description.trim() ? "" : "Please add an event description.";
}

export function validatePoster(data: SponsorEventFormData): string {
  return data.posterUrl ? "" : "Please upload the event poster.";
}

export function validateContactName(data: SponsorEventFormData): string {
  return data.contactName.trim() ? "" : "Please enter your name.";
}

export function validateContactEmail(data: SponsorEventFormData): string {
  const v = data.contactEmail.trim();
  if (!v) return "Please enter your email.";
  return EMAIL_RE.test(v) ? "" : "Enter a valid email address.";
}

export const FIELD_NAMES = {
  title: "title",
  slug: "slug",
  location: "location",
  externalUrl: "externalUrl",
  date: "date",
  time: "time",
  description: "description",
  posterUrl: "posterUrl",
  contactName: "contactName",
  contactEmail: "contactEmail",
} as const;

const STEP_VALIDATOR_MAP: Record<number, { field: string; fn: (data: SponsorEventFormData) => string }[]> = {
  1: [
    { field: FIELD_NAMES.title, fn: validateTitle },
    { field: FIELD_NAMES.slug, fn: validateSlug },
    { field: FIELD_NAMES.location, fn: validateLocation },
    { field: FIELD_NAMES.externalUrl, fn: validateExternalUrl },
  ],
  2: [
    { field: FIELD_NAMES.date, fn: validateDate },
    { field: FIELD_NAMES.time, fn: validateTime },
    { field: FIELD_NAMES.description, fn: validateDescription },
  ],
  3: [
    { field: FIELD_NAMES.posterUrl, fn: validatePoster },
    { field: FIELD_NAMES.contactName, fn: validateContactName },
    { field: FIELD_NAMES.contactEmail, fn: validateContactEmail },
  ],
  // Step 4 is Review — no fields of its own to validate.
  4: [],
};

export function validateStep(step: number, data: SponsorEventFormData): Record<string, string> {
  const entries = STEP_VALIDATOR_MAP[step] || [];
  const errors: Record<string, string> = {};
  for (const { field, fn } of entries) errors[field] = fn(data);
  return errors;
}

export function stepHasErrors(errors: Record<string, string>): boolean {
  return Object.values(errors).some(Boolean);
}

export function validateAllSteps(data: SponsorEventFormData): { errors: Record<string, string>; firstInvalidStep: number | null } {
  const errors: Record<string, string> = {};
  let firstInvalidStep: number | null = null;
  for (const step of [1, 2, 3]) {
    const stepErrors = validateStep(step, data);
    Object.assign(errors, stepErrors);
    if (firstInvalidStep === null && stepHasErrors(stepErrors)) firstInvalidStep = step;
  }
  return { errors, firstInvalidStep };
}
