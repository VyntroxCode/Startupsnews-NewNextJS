import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query } from '@/shared/database/connection';
import { runMorningSignal } from '@/lib/morning-signal.service';

async function setSetting(key: string, value: string): Promise<void> {
  await query(
    'INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()',
    [key, value, value]
  );
}

/** POST /api/admin/newsletter/cron-trigger — manually run Morning Signal for all subscribers */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const result = await runMorningSignal({ bypassEnabledCheck: true, bypassTimezoneFilter: true });

    const now = new Date().toISOString();
    await Promise.all([
      setSetting('nl_morning_signal_last_run', now),
      setSetting('nl_morning_signal_last_sent', String(result.sent)),
      setSetting('nl_morning_signal_last_total', String(result.total)),
    ]);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
