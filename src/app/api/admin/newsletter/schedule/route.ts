import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query, queryOne } from '@/shared/database/connection';

export interface ScheduleRow {
  id: number;
  subject: string;
  recipient_filter: string;
  scheduled_at: string;
  status: 'pending' | 'sending' | 'sent' | 'cancelled' | 'failed';
  sent_count: number;
  total_count: number;
  created_at: string;
  sent_at: string | null;
}

/** GET /api/admin/newsletter/schedule — list all schedules */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const rows = await query<ScheduleRow>(
      'SELECT id, subject, recipient_filter, scheduled_at, status, sent_count, total_count, created_at, sent_at FROM newsletter_schedules ORDER BY scheduled_at DESC LIMIT 50'
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/newsletter/schedule — create a scheduled send */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json() as {
      subject: string;
      html: string;
      recipientFilter: 'all' | string[] | { customRecipients: { email: string; name: string }[] };
      scheduledAt: string; // ISO datetime string
    };

    if (!body.subject?.trim()) return NextResponse.json({ success: false, error: 'Subject required' }, { status: 400 });
    if (!body.html?.trim()) return NextResponse.json({ success: false, error: 'Body required' }, { status: 400 });
    if (!body.scheduledAt) return NextResponse.json({ success: false, error: 'Scheduled time required' }, { status: 400 });

    const scheduledAt = new Date(body.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return NextResponse.json({ success: false, error: 'Scheduled time must be in the future' }, { status: 400 });
    }

    const result = await query<{ insertId: bigint }>(
      'INSERT INTO newsletter_schedules (subject, html, recipient_filter, scheduled_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)',
      [body.subject.trim(), body.html.trim(), JSON.stringify(body.recipientFilter), scheduledAt, auth.user.email, auth.user.email]
    );

    const id = Number((result as unknown as { insertId: bigint }).insertId);
    const created = await queryOne<ScheduleRow>('SELECT id, subject, recipient_filter, scheduled_at, status, created_at FROM newsletter_schedules WHERE id = ?', [id]);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
