import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { isSmtpConfigured, sendSmtpMail } from '@/lib/smtp';
import { getClientIp } from '@/lib/request-fingerprint';
// Module-scoped in-memory limiter; the key prefix keeps this route's counts separate from the
// other public forms sharing it.
import { checkRateLimit } from '@/lib/rate-limit/incubatx-rate-limiter';
import { SponsorEventSubmissionsService } from '@/modules/sponsor-event-submissions/service/sponsor-event-submissions.service';
import { SponsorEventSubmissionsRepository } from '@/modules/sponsor-event-submissions/repository/sponsor-event-submissions.repository';
import { SponsorEventValidationError, type SponsorEventSubmission } from '@/modules/sponsor-event-submissions/domain/types';
import { submissionToSalesLead } from '@/modules/sponsor-event-submissions/service/to-sales-lead';
import { SalesTrackerService } from '@/modules/sales-tracker/service/sales-tracker.service';
import { SalesTrackerRepository } from '@/modules/sales-tracker/repository/sales-tracker.repository';

export const runtime = 'nodejs';

const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

const service = new SponsorEventSubmissionsService(new SponsorEventSubmissionsRepository());
const salesTrackerService = new SalesTrackerService(new SalesTrackerRepository());

async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: secretKey, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

/** Every value in the notification email is visitor-typed, so it is escaped before going into HTML. */
function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendNotificationEmail(s: SponsorEventSubmission): Promise<void> {
  const subject = `Partner / Sponsor an Event – ${s.eventTitle}`;
  const text = [
    `Event Title: ${s.eventTitle}`,
    `Slug: ${s.eventSlug}`,
    `Location: ${s.location}`,
    `Date: ${s.eventDate}`,
    `Time: ${s.eventTime}`,
    s.externalUrl ? `External URL: ${s.externalUrl}` : null,
    `Poster: ${s.posterUrl}`,
    '',
    'Description:',
    s.description,
    '',
    `Submitted by: ${s.contactName} <${s.contactEmail}>`,
    s.phone ? `Phone: ${s.phone}` : null,
    '',
    `Saved in Admin → Sales Tracker → Sponsor Event submissions (ID ${s.id}).`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Partner / Sponsor an Event submission</h2>
      <p><strong>Event Title:</strong> ${esc(s.eventTitle)}</p>
      <p><strong>Slug:</strong> ${esc(s.eventSlug)}</p>
      <p><strong>Location:</strong> ${esc(s.location)}</p>
      <p><strong>Date:</strong> ${esc(s.eventDate)}</p>
      <p><strong>Time:</strong> ${esc(s.eventTime)}</p>
      ${s.externalUrl ? `<p><strong>External URL:</strong> <a href="${esc(s.externalUrl)}">${esc(s.externalUrl)}</a></p>` : ''}
      <p><strong>Poster:</strong> <a href="${esc(s.posterUrl)}">${esc(s.posterUrl)}</a></p>
      <img src="${esc(s.posterUrl)}" alt="Event poster" style="max-width: 320px; display: block; margin: 12px 0;" />
      <h3>Description</h3>
      <p>${esc(s.description).replace(/\n/g, '<br />')}</p>
      <hr />
      <p><strong>Submitted by:</strong> ${esc(s.contactName)} &lt;${esc(s.contactEmail)}&gt;</p>
      ${s.phone ? `<p><strong>Phone:</strong> ${esc(s.phone)}</p>` : ''}
      <p style="color:#666;font-size:12px;">Saved in Admin → Sales Tracker → Sponsor Event submissions (ID ${esc(s.id)}).</p>
    </div>
  `;

  await sendSmtpMail({
    to: process.env.SMTP_TO || 'office@startupnews.fyi',
    subject,
    text,
    html,
    replyTo: s.contactEmail,
  });
}

/** Public endpoint behind the /sponsor-event form. Each submission is saved to
 * `sponsor_event_submissions` (read by the admin Sales Tracker's "Sponsor Event submissions" card),
 * mirrored into `sales_leads` as a "Sponsor Event Page Leads" lead, and still emailed to the office
 * inbox as before. Saving is the one step that must succeed: the mirror and the email are
 * best-effort, so a mail or lead hiccup can no longer lose a request that is already stored. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (ip && !checkRateLimit(`sponsor-event:${ip}`, RATE_LIMIT)) {
    return NextResponse.json(
      { success: false, error: 'Too many submissions from this network. Please try again in a few minutes.' },
      { status: 429 }
    );
  }

  const [body, bodyError] = await parseJsonBody<Record<string, unknown>>(request);
  if (bodyError) return bodyError;
  if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

  const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
  if (!turnstileToken) {
    return NextResponse.json({ success: false, error: 'CAPTCHA verification is required.' }, { status: 400 });
  }
  const captchaValid = await verifyTurnstile(turnstileToken);
  if (!captchaValid) {
    return NextResponse.json({ success: false, error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
  }

  let saved: SponsorEventSubmission;
  try {
    saved = await service.create(body);
  } catch (error) {
    if (error instanceof SponsorEventValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error saving Sponsor an Event submission:', error);
    return NextResponse.json(
      { success: false, error: "We couldn't submit your request right now. Please try again." },
      { status: 500 }
    );
  }

  try {
    await salesTrackerService.saveLead(submissionToSalesLead(saved));
  } catch (mirrorError) {
    console.error('Error mirroring Sponsor an Event submission into sales_leads:', mirrorError);
  }

  if (isSmtpConfigured()) {
    try {
      await sendNotificationEmail(saved);
    } catch (mailError) {
      console.error('Sponsor event SMTP send failed:', mailError);
    }
  } else {
    console.warn('Sponsor event notification email skipped: SMTP is not configured on this server.');
  }

  return NextResponse.json({ success: true, data: { id: saved.id } }, { status: 201 });
}
