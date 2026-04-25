import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { isSmtpConfigured, sendSmtpMail } from '@/lib/smtp';

export const runtime = 'nodejs';

type AdvertisePayload = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  jobLevel?: string;
  industry?: string;
  company?: string;
  country?: string;
  objective?: string;
};

export async function POST(request: NextRequest) {
  if (!isSmtpConfigured()) {
    return NextResponse.json(
      { success: false, error: 'SMTP is not configured on this server.' },
      { status: 500 }
    );
  }

  const [body, bodyError] = await parseJsonBody<AdvertisePayload>(request);
  if (bodyError) return bodyError;

  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim();
  const email = body?.email?.trim();
  const company = body?.company?.trim();
  const objective = body?.objective?.trim();

  if (!firstName || !lastName || !email || !company || !objective) {
    return NextResponse.json(
      {
        success: false,
        error: 'Please fill the required fields before submitting.',
      },
      { status: 400 }
    );
  }

  const subject = `Advertise with us - ${company}`;
  const text = [
    `First Name: ${firstName}`,
    `Last Name: ${lastName}`,
    `Work Email: ${email}`,
    `Business Phone: ${body?.phone || ''}`,
    `Job Title: ${body?.jobTitle || ''}`,
    `Job Level: ${body?.jobLevel || ''}`,
    `Industry: ${body?.industry || ''}`,
    `Company: ${company}`,
    `Country: ${body?.country || ''}`,
    '',
    'Campaign objective / additional details:',
    objective,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Advertise with us enquiry</h2>
      <p><strong>First Name:</strong> ${firstName}</p>
      <p><strong>Last Name:</strong> ${lastName}</p>
      <p><strong>Work Email:</strong> ${email}</p>
      <p><strong>Business Phone:</strong> ${body?.phone || ''}</p>
      <p><strong>Job Title:</strong> ${body?.jobTitle || ''}</p>
      <p><strong>Job Level:</strong> ${body?.jobLevel || ''}</p>
      <p><strong>Industry:</strong> ${body?.industry || ''}</p>
      <p><strong>Company:</strong> ${company}</p>
      <p><strong>Country:</strong> ${body?.country || ''}</p>
      <h3>Campaign objective / additional details</h3>
      <p>${objective.replace(/\n/g, '<br />')}</p>
    </div>
  `;

  try {
    await sendSmtpMail({
      to: process.env.SMTP_TO || 'office@startupnews.fyi',
      subject,
      text,
      html,
      replyTo: email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SMTP send failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      },
      { status: 500 }
    );
  }
}