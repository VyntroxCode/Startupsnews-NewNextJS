import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { isSmtpConfigured, sendSmtpMail } from '@/lib/smtp';
import { getClientIp } from '@/lib/request-fingerprint';
// Module-scoped in-memory limiter; the key prefix keeps this route's counts separate from the
// other public forms sharing it.
import { checkRateLimit } from '@/lib/rate-limit/incubatx-rate-limiter';
import { AdvertiseSubmissionsService } from '@/modules/advertise-submissions/service/advertise-submissions.service';
import { AdvertiseSubmissionsRepository } from '@/modules/advertise-submissions/repository/advertise-submissions.repository';
import { AdvertiseValidationError, type AdvertiseSubmission } from '@/modules/advertise-submissions/domain/types';
import { submissionToSalesLead } from '@/modules/advertise-submissions/service/to-sales-lead';
import { SalesTrackerService } from '@/modules/sales-tracker/service/sales-tracker.service';
import { SalesTrackerRepository } from '@/modules/sales-tracker/repository/sales-tracker.repository';

export const runtime = 'nodejs';

const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

const service = new AdvertiseSubmissionsService(new AdvertiseSubmissionsRepository());
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

async function sendNotificationEmail(s: AdvertiseSubmission): Promise<void> {
  const subject = `Advertise with us - ${s.companyName}`;
  const text = [
    `Name: ${s.name}`,
    `Company: ${s.companyName}`,
    `Email: ${s.email}`,
    `Phone: ${s.phone}`,
    `Country: ${s.country}`,
    `City: ${s.city}`,
    `Budget Range: ${s.budgetRange}`,
    `Campaign Goal: ${s.campaignGoal}`,
    '',
    'Tell us more:',
    s.tellUsMore || '(not filled in)',
    '',
    `Saved in Admin → Sales Tracker → Advertise With Us leads (ID ${s.id}).`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Advertise with us enquiry</h2>
      <p><strong>Name:</strong> ${esc(s.name)}</p>
      <p><strong>Company:</strong> ${esc(s.companyName)}</p>
      <p><strong>Email:</strong> ${esc(s.email)}</p>
      <p><strong>Phone:</strong> ${esc(s.phone)}</p>
      <p><strong>Country:</strong> ${esc(s.country)}</p>
      <p><strong>City:</strong> ${esc(s.city)}</p>
      <p><strong>Budget Range:</strong> ${esc(s.budgetRange)}</p>
      <p><strong>Campaign Goal:</strong> ${esc(s.campaignGoal)}</p>
      <h3>Tell us more</h3>
      <p>${s.tellUsMore ? esc(s.tellUsMore).replace(/\n/g, '<br />') : '<em>Not filled in</em>'}</p>
      <p style="color:#666;font-size:12px;">Saved in Admin → Sales Tracker → Advertise With Us leads (ID ${esc(s.id)}).</p>
    </div>
  `;

  await sendSmtpMail({
    to: process.env.SMTP_TO || 'office@startupnews.fyi',
    subject,
    text,
    html,
    replyTo: s.email,
  });
}

/** Public endpoint behind the /advertise-with-us enquiry form. Each enquiry is saved to
 * `advertise_submissions` (the raw record of what was submitted), mirrored into `sales_leads` as an
 * "Advertise Page Leads" lead (see to-sales-lead.ts), and still emailed to the office as before.
 * Until 2026-10-08 the email was the only thing that happened, so a missed or failed mail lost the
 * enquiry. The mirror and the email are now both best-effort: neither can fail a request whose
 * enquiry is already stored. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (ip && !checkRateLimit(`advertise:${ip}`, RATE_LIMIT)) {
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

  let saved: AdvertiseSubmission;
  try {
    saved = await service.create(body);
  } catch (error) {
    if (error instanceof AdvertiseValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error saving Advertise With Us enquiry:', error);
    return NextResponse.json(
      { success: false, error: "We couldn't submit your enquiry right now. Please try again." },
      { status: 500 }
    );
  }

  try {
    await salesTrackerService.saveLead(submissionToSalesLead(saved));
  } catch (mirrorError) {
    console.error('Error mirroring Advertise With Us enquiry into sales_leads:', mirrorError);
  }

  if (isSmtpConfigured()) {
    try {
      await sendNotificationEmail(saved);
    } catch (mailError) {
      console.error('Advertise With Us SMTP send failed:', mailError);
    }
  }

  return NextResponse.json({ success: true, data: { id: saved.id } }, { status: 201 });
}
