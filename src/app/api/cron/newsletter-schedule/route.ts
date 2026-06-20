import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/shared/database/connection';
import nodemailer from 'nodemailer';

const CRON_SECRET = process.env.CRON_SECRET;

interface ScheduleRow {
  id: number;
  subject: string;
  html: string;
  recipient_filter: string;
  scheduled_at: string;
}
interface Recipient { id: number; name: string; email: string; newsletter_category_slugs: string | null; }

async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}

async function buildTransporter() {
  const host   = await getSetting('nl_smtp_host')   || process.env.SMTP_HOST  || '';
  const port   = await getSetting('nl_smtp_port')   || process.env.SMTP_PORT  || '465';
  const secure = await getSetting('nl_smtp_secure') || process.env.SMTP_SECURE || 'true';
  const user   = await getSetting('nl_smtp_user')   || process.env.SMTP_USER  || '';
  const pass   = await getSetting('nl_smtp_pass')   || process.env.SMTP_PASS  || '';
  if (!host || !user || !pass) throw new Error('SMTP not configured');
  return nodemailer.createTransport({ host, port: Number(port), secure: secure.toLowerCase() === 'true', auth: { user, pass } });
}

/**
 * GET /api/cron/newsletter-schedule?secret=...
 * Run every minute (or every 5 min) to dispatch pending scheduled newsletters.
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch all pending schedules due now
    const due = await query<ScheduleRow>(
      "SELECT id, subject, html, recipient_filter, scheduled_at FROM newsletter_schedules WHERE status = 'pending' AND scheduled_at <= NOW() ORDER BY scheduled_at ASC LIMIT 5"
    );

    if (due.length === 0) return NextResponse.json({ success: true, processed: 0 });

    const fromSetting = await getSetting('nl_smtp_from') || process.env.SMTP_FROM || '';
    const transporter = await buildTransporter();
    const summary: { id: number; sent: number; total: number; errors: number }[] = [];

    for (const schedule of due) {
      // Mark as sending to prevent double-fire
      await query("UPDATE newsletter_schedules SET status = 'sending' WHERE id = ? AND status = 'pending'", [schedule.id]);

      let filter: 'all' | string[] | { customRecipients: { email: string; name: string }[] };
      try { filter = JSON.parse(schedule.recipient_filter); } catch { filter = 'all'; }

      let recipients: { name: string; email: string }[] = [];

      if (typeof filter === 'object' && !Array.isArray(filter) && 'customRecipients' in filter) {
        recipients = filter.customRecipients;
      } else {
        let dbRows: Recipient[] = await query<Recipient>(
          'SELECT id, name, email, newsletter_category_slugs FROM public_registrations WHERE is_active = 1'
        );
        if (Array.isArray(filter) && filter.length > 0) {
          dbRows = dbRows.filter(r => {
            if (!r.newsletter_category_slugs) return false;
            const userSlugs = r.newsletter_category_slugs.split(',').map(s => s.trim());
            return (filter as string[]).some(slug => userSlugs.includes(slug));
          });
        }
        recipients = dbRows;
      }

      let sent = 0;
      const errors: string[] = [];
      for (const r of recipients) {
        try {
          await transporter.sendMail({
            from: fromSetting,
            to: r.email,
            subject: schedule.subject,
            html: schedule.html.replace(/\{\{name\}\}/g, r.name),
          });
          sent++;
        } catch (err) {
          errors.push(`${r.email}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const finalStatus = errors.length === recipients.length && recipients.length > 0 ? 'failed' : 'sent';
      await query(
        'UPDATE newsletter_schedules SET status = ?, sent_count = ?, total_count = ?, sent_at = NOW(), error_log = ? WHERE id = ?',
        [finalStatus, sent, recipients.length, errors.slice(0, 20).join('\n') || null, schedule.id]
      );
      summary.push({ id: schedule.id, sent, total: recipients.length, errors: errors.length });
    }

    return NextResponse.json({ success: true, processed: due.length, summary });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
