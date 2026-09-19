import { CUSTOM_CODE_RE } from "@/components/ui/constants/phone";
import { OTHER_CITY_VALUE, OTHER_COUNTRY_VALUE } from "@/components/submit-event/constants";
import type { LeadFormData } from "./types";

/** These helpers only ever read the phone fields, or only the location fields. They are typed on
 * those subsets rather than on the whole of `LeadFormData` so a form that collects the same two
 * values but not the rest of a lead — `/expand-north-star`'s travel enquiry, which has no company,
 * website or pitch deck — composes and resolves them through this exact code instead of a
 * look-alike copy. Every existing caller passes a full `LeadFormData`, which still satisfies both.
 */
export type PhoneParts = Pick<LeadFormData, "phone" | "phoneCode" | "phoneCodeCustom" | "phoneNumber">;
export type LocationParts = Pick<LeadFormData, "country" | "countryOther" | "city" | "cityOther">;

/** Turning the structured inputs a page may collect into the two canonical strings on
 * `LeadFormData` (`phone`, `countryCity`).
 *
 * These live apart from validation.ts because both sides need them: `useLeadForm` recomposes on
 * every edit, and the validators read the same resolved values, so a dial code or a manually typed
 * country can never be interpreted one way when stored and another when checked. */

/** The dial code actually in force — the picked one, or the typed one while "Other" is selected. */
export function resolvePhoneCode(data: PhoneParts): string {
  return data.phoneCode === "other" ? data.phoneCodeCustom.trim() : data.phoneCode;
}

/** Whether the typed "Other" dial code is a usable one. Only meaningful while "Other" is picked. */
export function hasValidCustomCode(data: PhoneParts): boolean {
  return CUSTOM_CODE_RE.test(data.phoneCodeCustom.trim());
}

export function composePhone(data: PhoneParts): string {
  const digits = data.phoneNumber.replace(/\D/g, "");
  if (!digits) return "";
  const code = resolvePhoneCode(data);
  return code ? `${code} ${digits}` : digits;
}

/** The country as a person would read it: the picked one, or what they typed under "Other". */
export function resolveCountry(data: LocationParts): string {
  return data.country === OTHER_COUNTRY_VALUE ? data.countryOther.trim() : data.country;
}

export function resolveCity(data: LocationParts): string {
  return data.city === OTHER_CITY_VALUE ? data.cityOther.trim() : data.city;
}

/** "India, Bengaluru" — or just whichever half exists, since both are optional on the one page
 * that collects them separately. */
export function composeCountryCity(data: LocationParts): string {
  return [resolveCountry(data), resolveCity(data)].filter(Boolean).join(", ");
}
