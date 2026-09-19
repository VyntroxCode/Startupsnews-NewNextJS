import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { getClientIp } from '@/lib/request-fingerprint';
// Module-scoped in-memory limiter; the key prefix keeps this route's counts separate from the
// other public forms sharing it.
import { checkRateLimit } from '@/lib/rate-limit/incubatx-rate-limiter';
import { isSmtpConfigured, sendSmtpMail } from '@/lib/smtp';
import { EnsTravelEnquiriesService } from '@/modules/ens-travel-enquiries/service/ens-travel-enquiries.service';
import { EnsTravelEnquiriesRepository } from '@/modules/ens-travel-enquiries/repository/ens-travel-enquiries.repository';
import { EnsTravelValidationError, type EnsTravelEnquiry } from '@/modules/ens-travel-enquiries/domain/types';
import { participationLabel } from '@/modules/ens-travel-enquiries/domain/participation';
import { foundUsText, referredByLabel } from '@/modules/ens-travel-enquiries/domain/sources';

export const runtime = 'nodejs';

const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

const service = new EnsTravelEnquiriesService(new EnsTravelEnquiriesRepository());

/** Every value in the notification email is visitor-typed, so it is escaped before going into HTML. */
function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendNotificationEmail(enquiry: EnsTravelEnquiry): Promise<void> {
  const participating = participationLabel(enquiry.participation);
  const referredBy = referredByLabel(enquiry.referredBy);
  const foundUs = foundUsText(enquiry.foundUs, enquiry.foundUsDetail);
  const subject = `Expand North Star enquiry – ${enquiry.name} (${participating})`;
  const text = [
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Contact: ${enquiry.contact}`,
    `City: ${enquiry.city}`,
    `Country: ${enquiry.country}`,
    `Participating as: ${participating}`,
    ...(enquiry.requirement ? ['', 'Requirement:', enquiry.requirement] : []),
    '',
    `Referred by: ${referredBy}`,
    `How they found us: ${foundUs}`,
    '',
    `Saved in Admin → Sales Tracker → Expand North Star enquiries (ID ${enquiry.id}).`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Expand North Star travel enquiry</h2>
      <p><strong>Name:</strong> ${esc(enquiry.name)}</p>
      <p><strong>Email:</strong> ${esc(enquiry.email)}</p>
      <p><strong>Contact:</strong> ${esc(enquiry.contact)}</p>
      <p><strong>City:</strong> ${esc(enquiry.city)}</p>
      <p><strong>Country:</strong> ${esc(enquiry.country)}</p>
      <p><strong>Participating as:</strong> ${esc(participating)}</p>
      ${enquiry.requirement ? `<h3>Requirement</h3><p>${esc(enquiry.requirement).replace(/\n/g, '<br />')}</p>` : ''}
      <p><strong>Referred by:</strong> ${esc(referredBy)}</p>
      <p><strong>How they found us:</strong> ${esc(foundUs)}</p>
      <hr />
      <p style="color:#666;font-size:12px;">Saved in Admin &rarr; Sales Tracker &rarr; Expand North Star
      enquiries (ID ${esc(enquiry.id)}).</p>
    </div>
  `;

  await sendSmtpMail({ to: process.env.SMTP_TO || 'office@startupnews.fyi', subject, text, html, replyTo: enquiry.email });
}

/** Public endpoint behind the "Plan your visit" form at the foot of /expand-north-star.
 *
 * Each enquiry is saved to `ens_travel_enquiries` — read by the admin Sales Tracker's own "Expand
 * North Star enquiries" card (KPI tiles → table → detail view with editing and its own lead status)
 * — then emailed to the office inbox. Unlike the other public forms it is deliberately NOT mirrored
 * into `sales_leads`: the team asked for these to stay entirely apart from the other pages' leads,
 * so they never appear in All leads. Saving is the one step that must succeed; the email is
 * best-effort, so it can't lose an enquiry already stored. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (ip && !checkRateLimit(`ens-travel-enquiry:${ip}`, RATE_LIMIT)) {
    return NextResponse.json(
      { success: false, error: 'Too many submissions from this network. Please try again in a few minutes.' },
      { status: 429 }
    );
  }

  const [body, bodyError] = await parseJsonBody<Record<string, unknown>>(request);
  if (bodyError) return bodyError;
  if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

  let enquiry: EnsTravelEnquiry;
  try {
    enquiry = await service.create(body);
  } catch (error) {
    if (error instanceof EnsTravelValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error saving Expand North Star travel enquiry:', error);
    return NextResponse.json(
      { success: false, error: "We couldn't send your details right now. Please try again." },
      { status: 500 }
    );
  }

  if (isSmtpConfigured()) {
    try {
      await sendNotificationEmail(enquiry);
    } catch (mailError) {
      console.error('Expand North Star travel enquiry SMTP send failed:', mailError);
    }
  } else {
    console.warn('Expand North Star travel enquiry email skipped: SMTP is not configured on this server.');
  }

  return NextResponse.json({ success: true, data: { id: enquiry.id } }, { status: 201 });
}
