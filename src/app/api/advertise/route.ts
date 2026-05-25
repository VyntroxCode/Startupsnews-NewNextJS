import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { isSmtpConfigured, sendSmtpMail } from '@/lib/smtp';

export const runtime = 'nodejs';

type AdvertisePayload = {
  firstName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  budgetRate?: string;
  campaignGoal?: string;
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
  const companyName = body?.companyName?.trim();
  const email = body?.email?.trim();
  const objective = body?.objective?.trim();

  if (!firstName || !companyName || !email || !objective) {
    return NextResponse.json(
      {
        success: false,
        error: 'Please fill the required fields before submitting.',
      },
      { status: 400 }
    );
  }

  const subject = `Advertise with us - ${companyName}`;
  const text = [
    `Name: ${firstName}`,
    `Company: ${companyName}`,
    `Email: ${email}`,
    `Phone: ${body?.phone || ''}`,
    `Budget Rate: ${body?.budgetRate || ''}`,
    `Campaign Goal: ${body?.campaignGoal || ''}`,
    '',
    'Tell us more:',
    objective,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2>Advertise with us enquiry</h2>
      <p><strong>Name:</strong> ${firstName}</p>
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${body?.phone || ''}</p>
      <p><strong>Budget Rate:</strong> ${body?.budgetRate || ''}</p>
      <p><strong>Campaign Goal:</strong> ${body?.campaignGoal || ''}</p>
      <h3>Tell us more</h3>
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