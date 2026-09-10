import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { isSmtpConfigured, sendSmtpMail } from '@/lib/smtp';

export const runtime = 'nodejs';

type SponsorEventPayload = {
  title?: string;
  slug?: string;
  location?: string;
  externalUrl?: string;
  date?: string;
  time?: string;
  description?: string;
  posterUrl?: string;
  contactName?: string;
  contactEmail?: string;
  turnstileToken?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

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

export async function POST(request: NextRequest) {
  if (!isSmtpConfigured()) {
    return NextResponse.json({ success: false, error: 'SMTP is not configured on this server.' }, { status: 500 });
  }

  const [body, bodyError] = await parseJsonBody<SponsorEventPayload>(request);
  if (bodyError) return bodyError;

  const turnstileToken = body?.turnstileToken?.trim();
  if (!turnstileToken) {
    return NextResponse.json({ success: false, error: 'CAPTCHA verification is required.' }, { status: 400 });
  }
  const captchaValid = await verifyTurnstile(turnstileToken);
  if (!captchaValid) {
    return NextResponse.json({ success: false, error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
  }

  const title = body?.title?.trim();
  const slug = body?.slug?.trim();
  const location = body?.location?.trim();
  const date = body?.date?.trim();
  const time = body?.time?.trim();
  const description = body?.description?.trim();
  const posterUrl = body?.posterUrl?.trim();
  const contactName = body?.contactName?.trim();
  const contactEmail = body?.contactEmail?.trim();
  const externalUrl = body?.externalUrl?.trim();

  const missing: string[] = [];
  if (!title) missing.push('event title');
  if (!slug) missing.push('slug');
  if (!location) missing.push('location');
  if (!date) missing.push('date');
  if (!time) missing.push('time');
  if (!description) missing.push('description');
  if (!posterUrl) missing.push('event poster');
  if (!contactName) missing.push('your name');
  if (!contactEmail) missing.push('your email');
  if (missing.length) {
    return NextResponse.json(
      { success: false, error: `Please fill the following required fields: ${missing.join(', ')}.` },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(contactEmail!)) {
    return NextResponse.json({ success: false, error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (externalUrl && !isValidHttpUrl(externalUrl)) {
    return NextResponse.json({ success: false, error: 'Enter a valid http:// or https:// URL.' }, { status: 400 });
  }

  const subject = `Partner / Sponsor an Event – ${title}`;
  const text = [
    `Event Title: ${title}`,
    `Slug: ${slug}`,
    `Location: ${location}`,
    `Date: ${date}`,
    `Time: ${time}`,
    externalUrl ? `External URL: ${externalUrl}` : null,
    `Poster: ${posterUrl}`,
    '',
    'Description:',
    description,
    '',
    `Submitted by: ${contactName} <${contactEmail}>`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Partner / Sponsor an Event submission</h2>
      <p><strong>Event Title:</strong> ${title}</p>
      <p><strong>Slug:</strong> ${slug}</p>
      <p><strong>Location:</strong> ${location}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      ${externalUrl ? `<p><strong>External URL:</strong> <a href="${externalUrl}">${externalUrl}</a></p>` : ''}
      <p><strong>Poster:</strong> <a href="${posterUrl}">${posterUrl}</a></p>
      <img src="${posterUrl}" alt="Event poster" style="max-width: 320px; display: block; margin: 12px 0;" />
      <h3>Description</h3>
      <p>${description!.replace(/\n/g, '<br />')}</p>
      <hr />
      <p><strong>Submitted by:</strong> ${contactName} &lt;${contactEmail}&gt;</p>
    </div>
  `;

  try {
    await sendSmtpMail({
      to: process.env.SMTP_TO || 'office@startupnews.fyi',
      subject,
      text,
      html,
      replyTo: contactEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sponsor event SMTP send failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to send email' },
      { status: 500 }
    );
  }
}
