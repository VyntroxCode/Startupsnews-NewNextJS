import { PHONE_RULES } from "@/components/ui/constants/phone";
import { hasValidCustomCode, resolvePhoneCode } from "./compose";
import type { LeadFormData } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function validateName(data: LeadFormData): string {
  return data.name.trim() ? "" : "Please enter your name.";
}

export function validateCompanyName(data: LeadFormData): string {
  return data.companyName.trim() ? "" : "Please enter your company name.";
}

/** Two collection modes, one rule set.
 *
 * A page that collects a dial code separately (Feature Your Startup, via the shared PhoneField)
 * gets the same per-country check /list-your-event applies — a 10-digit Indian number starting
 * 6-9, an 8-digit Singapore number, and so on — because a "phone number" that is valid everywhere
 * is valid nowhere, and the reader would only find out after we failed to reach them.
 *
 * A page that still takes one typed string keeps the original loose digit count. The branch is on
 * `phoneCode` being set at all, which only a page using the structured control ever does, so the
 * other two forms are unaffected by this living here. */
export function validatePhone(data: LeadFormData): string {
  if (!data.phoneCode) {
    const digits = data.phone.replace(/\D/g, "");
    if (!digits) return "Please enter a phone number.";
    if (digits.length < 7) return "Enter a valid phone number.";
    return "";
  }

  if (data.phoneCode === "other" && !hasValidCustomCode(data)) {
    return "Enter a valid country code (e.g. +34).";
  }
  const digits = data.phoneNumber.replace(/\D/g, "");
  if (!digits) return "Please enter a phone number.";
  const rule = PHONE_RULES[resolvePhoneCode(data)] || PHONE_RULES.other;
  return rule.pattern.test(digits) ? "" : rule.message;
}

export function validateEmail(data: LeadFormData): string {
  const v = data.email.trim();
  if (!v) return "Please enter your official email.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address.";
  return "";
}

/** Website is optional — only validated once something has actually been typed. */
export function validateWebsite(data: LeadFormData): string {
  const v = data.website.trim();
  if (!v) return "";
  if (!URL_RE.test(v)) return "Enter a valid URL (e.g. https://yourstartup.com).";
  return "";
}

export function validatePdfFile(data: LeadFormData): string {
  const f = data.pdfFile;
  if (!f) return "Please upload a PDF with the details.";
  if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are supported.";
  }
  if (f.size > MAX_PDF_BYTES) return "File is too large — max 10MB.";
  return "";
}

interface StepValidatorEntry {
  field: string;
  fn: (d: LeadFormData) => string;
}

const STEP_VALIDATOR_MAP: Record<number, StepValidatorEntry[]> = {
  1: [
    { field: "name", fn: validateName },
    { field: "companyName", fn: validateCompanyName },
    { field: "phone", fn: validatePhone },
  ],
  2: [
    { field: "email", fn: validateEmail },
    { field: "website", fn: validateWebsite },
  ],
  3: [{ field: "pdfFile", fn: validatePdfFile }],
};

export function validateStep(step: number, data: LeadFormData): Record<string, string> {
  const entries = STEP_VALIDATOR_MAP[step] || [];
  const errors: Record<string, string> = {};
  for (const { field, fn } of entries) errors[field] = fn(data);
  return errors;
}

export function stepHasErrors(errors: Record<string, string>): boolean {
  return Object.values(errors).some(Boolean);
}
