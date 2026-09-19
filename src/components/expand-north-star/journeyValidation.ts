import { resolveCity, resolveCountry } from "@/components/lead-forms/shared/compose";
import { validatePhone } from "@/components/lead-forms/shared/validation";
import {
  isParticipationValue,
  PARTICIPATION_OTHERS,
  REQUIREMENT_MAX_LENGTH,
} from "@/modules/ens-travel-enquiries/domain/participation";
import {
  FOUND_US_DETAIL_MAX_LENGTH,
  FOUND_US_OTHERS,
  isFoundUsValue,
  isReferredByValue,
} from "@/modules/ens-travel-enquiries/domain/sources";

/** A travel enquiry from the closing form on /expand-north-star.
 *
 * The field set is deliberately the one the site's other lead forms use, collected with the very
 * same controls — `ui/PhoneField` for the dial code and number, `submit-event/CountryCityFields`
 * for Country and City — so a visitor who has filled /feature-your-startup, /submit-funding-round
 * or /submit-press-release meets exactly the same thing here.
 *
 * As on those pages, `phone` and `countryCity` are the CANONICAL values and the structured fields
 * under them are only how they are collected; `useJourneyForm` recomposes both on every edit using
 * `lead-forms/shared/compose`, so a submission can never carry a number or a place the visitor no
 * longer sees. See components/lead-forms/shared/types.ts for the original statement of this split.
 */
export interface JourneyFormData {
  name: string;
  email: string;
  /** Canonical phone, e.g. "+91 9876543210" — composed from the three fields below. */
  phone: string;
  phoneCode: string;
  /** Free-text dial code, used only while `phoneCode` is "other". */
  phoneCodeCustom: string;
  phoneNumber: string;
  /** Canonical location, e.g. "India, Mumbai" — composed from the four fields below. */
  countryCity: string;
  country: string;
  /** Free-text country, used only while `country` is the "Other (add manually)" sentinel. */
  countryOther: string;
  city: string;
  /** Free-text city, used only while `city` is the "Other (add manually)" sentinel. */
  cityOther: string;
  /** A `PARTICIPATION_OPTIONS` value, or "" until one is picked. */
  participation: string;
  /** Free text, asked for only while `participation` is "others". */
  requirement: string;
  /** A `REFERRED_BY_OPTIONS` value, or "" — optional, most visitors were not referred. */
  referredBy: string;
  /** A `FOUND_US_OPTIONS` value, or "" until one is picked. */
  foundUs: string;
  /** Free text, asked for only while `foundUs` is "others". */
  foundUsDetail: string;
}

export type JourneyField =
  | "name" | "participation" | "requirement" | "email" | "phone" | "country" | "city"
  | "referredBy" | "foundUs" | "foundUsDetail";

/** Reading order (the form's layout order), and the order the first error is looked for in when
 * submit is pressed. */
export const JOURNEY_FIELDS: JourneyField[] = [
  "name", "participation", "requirement", "email", "phone", "country", "city", "referredBy", "foundUs", "foundUsDetail",
];

/** The id of each field's focusable control, so an invalid submit can put the cursor on it. These
 * follow the shared components' own id scheme: `FormField` renders `f-<id>`, `PhoneField` renders
 * `f-<id>-number`, and `CountryCityFields` puts its two selects in `#field-country` / `#field-city`.
 * "Participating As" is a shared `CustomSelect`, which takes no id, so its wrapper carries one. */
export const FIELD_FOCUS_TARGET: Record<JourneyField, string> = {
  name: "#f-ens-jf-name",
  email: "#f-ens-jf-email",
  phone: "#f-ens-jf-phone-number",
  country: "#field-country .cs-input",
  city: "#field-city .custom-select-btn",
  participation: "#field-ens-jf-participation .custom-select-btn",
  requirement: "#f-ens-jf-requirement",
  referredBy: "#field-ens-jf-referred-by .custom-select-btn",
  foundUs: "#field-ens-jf-found-us .custom-select-btn",
  foundUsDetail: "#f-ens-jf-found-us-detail",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateName(data: JourneyFormData): string {
  return data.name.trim() ? "" : "Please enter your full name.";
}

function validateEmail(data: JourneyFormData): string {
  const value = data.email.trim();
  if (!value) return "Please enter your email address.";
  if (!EMAIL_RE.test(value)) return "Please enter a valid email address.";
  return "";
}

/** The country must be picked, and a country entered under "Other (add manually)" must actually
 * have been typed — otherwise the sentinel would submit as an empty place. */
function validateCountry(data: JourneyFormData): string {
  if (!data.country) return "Please select your country.";
  return resolveCountry(data) ? "" : "Please enter your country.";
}

function validateCity(data: JourneyFormData): string {
  if (!data.city) return "Please select your city.";
  return resolveCity(data) ? "" : "Please enter your city.";
}

function validateParticipation(data: JourneyFormData): string {
  if (!data.participation) return "Please select how you are participating.";
  return isParticipationValue(data.participation) ? "" : "Please select one of the listed options.";
}

/** Only asked for under "Others"; for every other option there is nothing to check. */
function validateRequirement(data: JourneyFormData): string {
  if (data.participation !== PARTICIPATION_OTHERS) return "";
  const value = data.requirement.trim();
  if (!value) return "Please describe your requirement.";
  if (value.length > REQUIREMENT_MAX_LENGTH) return `Please keep it under ${REQUIREMENT_MAX_LENGTH} characters.`;
  return "";
}

/** `phone` is the shared validator, not a copy: the per-country digit rules in
 * `ui/constants/phone.ts` (a 10-digit Indian number starting 6-9, an 8-digit Singapore number, and
 * so on) apply here exactly as they do on the other three lead pages, including the "+xxx" typed
 * under "Other". */
export const JOURNEY_VALIDATORS: Record<JourneyField, (data: JourneyFormData) => string> = {
  name: validateName,
  email: validateEmail,
  phone: validatePhone,
  participation: validateParticipation,
  requirement: validateRequirement,
  country: validateCountry,
  city: validateCity,
  referredBy: validateReferredBy,
  foundUs: validateFoundUs,
  foundUsDetail: validateFoundUsDetail,
};

/** Optional, so only a value that is somehow not on the list is refused. */
function validateReferredBy(data: JourneyFormData): string {
  if (!data.referredBy) return "";
  return isReferredByValue(data.referredBy) ? "" : "Please select one of the listed referrers.";
}

function validateFoundUs(data: JourneyFormData): string {
  if (!data.foundUs) return "Please tell us how you found us.";
  return isFoundUsValue(data.foundUs) ? "" : "Please select one of the listed options.";
}

/** Only asked for under "Others". */
function validateFoundUsDetail(data: JourneyFormData): string {
  if (data.foundUs !== FOUND_US_OTHERS) return "";
  const value = data.foundUsDetail.trim();
  if (!value) return "Please tell us where you found us.";
  if (value.length > FOUND_US_DETAIL_MAX_LENGTH) return `Please keep it under ${FOUND_US_DETAIL_MAX_LENGTH} characters.`;
  return "";
}

export type JourneyErrors = Partial<Record<JourneyField, string>>;

export function validateAll(data: JourneyFormData): JourneyErrors {
  const errors: JourneyErrors = {};
  for (const field of JOURNEY_FIELDS) errors[field] = JOURNEY_VALIDATORS[field](data);
  return errors;
}

export function firstInvalidField(errors: JourneyErrors): JourneyField | null {
  return JOURNEY_FIELDS.find((field) => !!errors[field]) || null;
}
