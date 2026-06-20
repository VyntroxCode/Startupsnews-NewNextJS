import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query, queryOne } from '@/shared/database/connection';

/** DELETE /api/admin/newsletter/schedule/[id] — cancel a pending schedule */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const row = await queryOne<{ status: string }>('SELECT status FROM newsletter_schedules WHERE id = ?', [Number(id)]);
    if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    if (row.status !== 'pending') return NextResponse.json({ success: false, error: `Cannot cancel a schedule with status: ${row.status}` }, { status: 400 });
    await query('UPDATE newsletter_schedules SET status = ? WHERE id = ?', ['cancelled', Number(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
