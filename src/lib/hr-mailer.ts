import { isSmtpConfigured, sendSmtpMail, type MailPayload } from '@/lib/smtp';

/*
 * Every email the HR tool sends — offer letters on hire, and offboarding (resignation received,
 * decision, settlement, letters). Sending must never break the HR action that triggered it: each
 * send is capped by a timeout and returns a result instead of throwing, so the caller can record
 * truthfully whether it went out. HR_MAIL_DRY_RUN=true logs instead of sending (test servers).
 */

const SEND_TIMEOUT_MS = 20_000;

export type MailResult = { ok: true; dryRun?: boolean } | { ok: false; error: string };

export function hrOpsInbox(): string {
  return process.env.HR_OPS_EMAIL || process.env.SMTP_TO || 'office@startupnews.fyi';
}

export async function sendHrMail(payload: MailPayload): Promise<MailResult> {
  if (process.env.HR_MAIL_DRY_RUN === 'true') {
    console.log(`[HR][MAIL DRY RUN] → ${payload.to} | ${payload.subject}${payload.attachments?.length ? ` | ${payload.attachments.length} attachment(s)` : ''}`);
    return { ok: true, dryRun: true };
  }
  if (!isSmtpConfigured()) return { ok: false, error: 'Email is not set up on this server (SMTP settings missing).' };
  try {
    await Promise.race([
      sendSmtpMail(payload),
      new Promise((_, reject) => setTimeout(() => reject(new Error('The mail server did not respond in time.')), SEND_TIMEOUT_MS)),
    ]);
    return { ok: true };
  } catch (e) {
    const error = friendlyMailError(e);
    console.error('[HR] Email failed:', payload.subject, '→', payload.to, e instanceof Error ? e.message : e);
    return { ok: false, error };
  }
}

/** SMTP errors are multi-line server responses; HR needs one line that says what to do. */
function friendlyMailError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? 'Unknown email error');
  if (/535|Invalid login|BadCredentials|Username and Password not accepted/i.test(msg)) {
    return 'The mail server rejected the site\'s email login (SMTP password no longer valid) — ask the admin to update SMTP_PASS.';
  }
  return msg.split('\n')[0].slice(0, 300);
}

/** Plain text + a minimal HTML version of the same paragraphs. */
export function mailBody(paragraphs: string[]): { text: string; html: string } {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return {
    text: paragraphs.join('\n\n'),
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#0f172a">${paragraphs.map((p) => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`).join('')}</div>`,
  };
}

export interface OfferLetterMailInput {
  to: string;
  employeeName: string;
  subject: string;
  /** The approved letter text — the email body. */
  textBody: string;
  /** The same letter as a PDF, attached. */
  pdf: Uint8Array;
  pdfFilename: string;
}

/** Emails a new hire their offer letter (text in the body, PDF attached). */
export async function sendOfferLetterEmail(input: OfferLetterMailInput): Promise<MailResult> {
  return sendHrMail({
    to: input.to,
    subject: input.subject,
    ...mailBody([input.textBody]),
    attachments: [{ filename: input.pdfFilename, content: Buffer.from(input.pdf), contentType: 'application/pdf' }],
  });
}
