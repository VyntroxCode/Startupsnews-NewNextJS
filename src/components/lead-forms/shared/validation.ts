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

export function validatePhone(data: LeadFormData): string {
  const digits = data.phone.replace(/\D/g, "");
  if (!digits) return "Please enter a phone number.";
  if (digits.length < 7) return "Enter a valid phone number.";
  return "";
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
