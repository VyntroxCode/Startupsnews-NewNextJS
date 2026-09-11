import { CUSTOM_CODE_RE } from "@/components/ui/constants/phone";
import { OTHER_CITY_VALUE, OTHER_COUNTRY_VALUE } from "@/components/submit-event/constants";
import type { LeadFormData } from "./types";

/** Turning the structured inputs a page may collect into the two canonical strings on
 * `LeadFormData` (`phone`, `countryCity`).
 *
 * These live apart from validation.ts because both sides need them: `useLeadForm` recomposes on
 * every edit, and the validators read the same resolved values, so a dial code or a manually typed
 * country can never be interpreted one way when stored and another when checked. */

/** The dial code actually in force — the picked one, or the typed one while "Other" is selected. */
export function resolvePhoneCode(data: LeadFormData): string {
  return data.phoneCode === "other" ? data.phoneCodeCustom.trim() : data.phoneCode;
}

/** Whether the typed "Other" dial code is a usable one. Only meaningful while "Other" is picked. */
export function hasValidCustomCode(data: LeadFormData): boolean {
  return CUSTOM_CODE_RE.test(data.phoneCodeCustom.trim());
}

export function composePhone(data: LeadFormData): string {
  const digits = data.phoneNumber.replace(/\D/g, "");
  if (!digits) return "";
  const code = resolvePhoneCode(data);
  return code ? `${code} ${digits}` : digits;
}

/** The country as a person would read it: the picked one, or what they typed under "Other". */
export function resolveCountry(data: LeadFormData): string {
  return data.country === OTHER_COUNTRY_VALUE ? data.countryOther.trim() : data.country;
}

export function resolveCity(data: LeadFormData): string {
  return data.city === OTHER_CITY_VALUE ? data.cityOther.trim() : data.city;
}

/** "India, Bengaluru" — or just whichever half exists, since both are optional on the one page
 * that collects them separately. */
export function composeCountryCity(data: LeadFormData): string {
  return [resolveCountry(data), resolveCity(data)].filter(Boolean).join(", ");
}
