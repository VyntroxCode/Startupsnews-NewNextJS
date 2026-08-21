export interface OfferLetterMailInput {
  to: string;
  employeeName: string;
  subject: string;
  textBody: string;
}

/**
 * Dispatches the generated offer letter to a new hire's email. Dummy for now — logs what would
 * be sent instead of actually emailing, so the generate → send → record pipeline is fully wired
 * (called from POST /api/admin/hr-tool/onboarding/send-offer-letter) without needing a dedicated
 * HR-sender SMTP identity set up yet. Swap the body for a real dispatch (e.g. sendSmtpMail from
 * '@/lib/smtp') when that's ready — the call site doesn't need to change.
 */
export async function sendOfferLetterEmail(input: OfferLetterMailInput): Promise<{ ok: true; dummy: true }> {
  console.log(
    `[HR][DUMMY EMAIL] Offer letter → ${input.to} (${input.employeeName})\n` +
    `Subject: ${input.subject}\n` +
    `--------------------------------------------------------------\n` +
    `${input.textBody}\n` +
    `--------------------------------------------------------------`
  );
  return { ok: true, dummy: true };
}
