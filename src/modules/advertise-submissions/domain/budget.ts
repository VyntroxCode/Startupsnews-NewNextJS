/** Rules for the Advertise With Us "Budget Range" box — one definition for the browser
 * (AdvertiseEnquiryForm) and the server (advertise-submissions.service), so the form can never
 * accept something the API then rejects.
 *
 * It stays free text because budgets arrive in every currency and notation ("$5,000 – $10,000",
 * "₹2-5 lakh", "10k USD"), but it has to actually name an amount: at least one digit, and only
 * letters, digits, currency symbols and the punctuation an amount or a range uses. That keeps out
 * "not sure", "call me", links and pasted paragraphs. */
export const BUDGET_RANGE_MAX_LENGTH = 60;

const BUDGET_ALLOWED_RE = /^[\p{L}\p{Sc}\d\s.,+/\-–—]+$/u;

/** Returns the problem with `value` as a message for the visitor, or '' when it is fine. */
export function validateBudgetRange(value: string): string {
  const v = value.trim();
  if (!v) return 'Please enter your budget range.';
  if (v.length > BUDGET_RANGE_MAX_LENGTH) return `Keep the budget under ${BUDGET_RANGE_MAX_LENGTH} characters.`;
  if (!/\d/.test(v)) return 'Enter an amount, e.g. $5,000 – $10,000.';
  if (!BUDGET_ALLOWED_RE.test(v)) return 'Use numbers, a currency and a dash only, e.g. $5,000 – $10,000.';
  return '';
}
