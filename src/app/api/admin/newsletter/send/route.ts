import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query } from '@/shared/database/connection';
import { buildNewsletterTransporter, getNewsletterFrom } from '@/lib/newsletter-mailer';

interface Recipient { id: number; name: string; email: string; newsletter_category_slugs: string | null; }

/** POST /api/admin/newsletter/send */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json() as {
      subject: string;
      html: string;
      recipientFilter?: 'all' | string[];
      customRecipients?: { email: string; name: string }[];
      testEmail?: string;
    };

    if (!body.subject?.trim()) {
      return NextResponse.json({ success: false, error: 'Subject is required' }, { status: 400 });
    }
    if (!body.html?.trim()) {
      return NextResponse.json({ success: false, error: 'Email body is required' }, { status: 400 });
    }

    const fromSetting = await getNewsletterFrom();
    const transporter = await buildNewsletterTransporter();

    // Test send
    if (body.testEmail) {
      await transporter.sendMail({
        from: fromSetting,
        to: body.testEmail,
        subject: `[TEST] ${body.subject}`,
        html: body.html,
      });
      return NextResponse.json({ success: true, sent: 1, mode: 'test' });
    }

    // Determine recipients
    let finalRecipients: { name: string; email: string }[] = [];

    if (Array.isArray(body.customRecipients) && body.customRecipients.length > 0) {
      // Custom list — use as-is
      finalRecipients = body.customRecipients;
    } else {
      // Fetch from DB
      let dbRecipients: Recipient[] = await query<Recipient>(
        'SELECT id, name, email, newsletter_category_slugs FROM public_registrations WHERE is_active = 1 AND (newsletter_unsubscribed IS NULL OR newsletter_unsubscribed = 0)'
      );
      const filterSlugs = Array.isArray(body.recipientFilter) ? body.recipientFilter : [];
      if (filterSlugs.length > 0) {
        dbRecipients = dbRecipients.filter((r) => {
          if (!r.newsletter_category_slugs) return false;
          const userSlugs = r.newsletter_category_slugs.split(',').map((s: string) => s.trim());
          return filterSlugs.some((slug: string) => userSlugs.includes(slug));
        });
      }
      finalRecipients = dbRecipients;
    }

    if (finalRecipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No recipients found' }, { status: 400 });
    }

    // Send to each recipient individually
    let sent = 0;
    const errors: string[] = [];
    for (const r of finalRecipients) {
      try {
        await transporter.sendMail({
          from: fromSetting,
          to: r.email,
          subject: body.subject,
          html: body.html.replace(/\{\{name\}\}/g, r.name),
        });
        sent++;
      } catch (err) {
        errors.push(`${r.email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({ success: true, sent, total: finalRecipients.length, errors: errors.slice(0, 10) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** GET /api/admin/newsletter/send — preview recipient count */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';

  try {
    const recipients: Recipient[] = await query<Recipient>(
      'SELECT id, newsletter_category_slugs FROM public_registrations WHERE is_active = 1 AND (newsletter_unsubscribed IS NULL OR newsletter_unsubscribed = 0)'
    );

    if (filter === 'all') {
      return NextResponse.json({ success: true, count: recipients.length });
    }

    const slugs = filter.split(',').map(s => s.trim()).filter(Boolean);
    const count = recipients.filter((r) => {
      if (!r.newsletter_category_slugs) return false;
      const userSlugs = r.newsletter_category_slugs.split(',').map(s => s.trim());
      return slugs.some(slug => userSlugs.includes(slug));
    }).length;

    return NextResponse.json({ success: true, count });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
