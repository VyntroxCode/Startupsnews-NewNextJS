import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { isSmtpConfigured, sendSmtpMail } from '@/lib/smtp';
import { getClientIp } from '@/lib/request-fingerprint';
// Module-scoped in-memory limiter; the key prefix keeps this route's counts separate.
import { checkRateLimit } from '@/lib/rate-limit/incubatx-rate-limiter';
import { CONTACT_TOPICS } from '@/app/contact-us/topics';

export const runtime = 'nodejs';

/** Every "Get in touch" message from /contact-us goes to this inbox. */
const CONTACT_INBOX = 'office@startupnews.fyi';

const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

type ContactPayload = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  topic?: string;
  message?: string;
  turnstileToken?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  const ip = getClientIp(request);
  if (ip && !checkRateLimit(`contact-us:${ip}`, RATE_LIMIT)) {
    return NextResponse.json(
      { success: false, error: 'Too many messages from this network. Please try again in a few minutes.' },
      { status: 429 }
    );
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { success: false, error: 'SMTP is not configured on this server.' },
      { status: 500 }
    );
  }

  const [body, bodyError] = await parseJsonBody<ContactPayload>(request);
  if (bodyError) return bodyError;

  const turnstileToken = body?.turnstileToken?.trim();
  if (!turnstileToken) {
    return NextResponse.json({ success: false, error: 'CAPTCHA verification is required.' }, { status: 400 });
  }
  if (!(await verifyTurnstile(turnstileToken))) {
    return NextResponse.json(
      { success: false, error: 'CAPTCHA verification failed. Please try again.' },
      { status: 400 }
    );
  }

  const name = body?.name?.trim().slice(0, 120) ?? '';
  const email = body?.email?.trim().slice(0, 200) ?? '';
  const phone = body?.phone?.trim().slice(0, 40) ?? '';
  const company = body?.company?.trim().slice(0, 160) ?? '';
  const topic = (CONTACT_TOPICS as readonly string[]).includes(body?.topic ?? '') ? body!.topic! : 'General enquiry';
  const message = body?.message?.trim().slice(0, 5000) ?? '';

  if (!name || !email || !message) {
    return NextResponse.json(
      { success: false, error: 'Please fill your name, email and message before sending.' },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const rows: [string, string][] = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone || '—'],
    ['Company', company || '—'],
    ['Topic', topic],
  ];

  const subject = `Contact Us: ${topic} — ${name}`;
  const text = [...rows.map(([k, v]) => `${k}: ${v}`), '', 'Message:', message].join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>New message from the Contact Us page</h2>
      ${rows.map(([k, v]) => `<p><strong>${k}:</strong> ${escapeHtml(v)}</p>`).join('')}
      <h3>Message</h3>
      <p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
    </div>
  `;

  try {
    await sendSmtpMail({ to: CONTACT_INBOX, subject, text, html, replyTo: email });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact Us SMTP send failed:', error);
    return NextResponse.json(
      { success: false, error: "We couldn't send your message right now. Please try again." },
      { status: 500 }
    );
  }
}
