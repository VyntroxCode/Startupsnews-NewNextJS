import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query, queryOne } from '@/shared/database/connection';

async function getSetting(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', [key]);
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await query(
    'INSERT INTO site_settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()',
    [key, value, value]
  );
}

/** GET /api/admin/newsletter/cron-config */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const [enabled, cronExpr, lastRun, lastSent, lastTotal] = await Promise.all([
      getSetting('nl_morning_signal_enabled'),
      getSetting('nl_morning_signal_cron'),
      getSetting('nl_morning_signal_last_run'),
      getSetting('nl_morning_signal_last_sent'),
      getSetting('nl_morning_signal_last_total'),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        enabled: enabled === '1',
        cronExpr: cronExpr ?? '0 * * * *',
        lastRun: lastRun ?? null,
        lastSent: lastSent ? Number(lastSent) : null,
        lastTotal: lastTotal ? Number(lastTotal) : null,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/newsletter/cron-config */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json() as { enabled: boolean; cronExpr?: string };
    await setSetting('nl_morning_signal_enabled', body.enabled ? '1' : '0');
    if (body.cronExpr) {
      await setSetting('nl_morning_signal_cron', body.cronExpr.trim());
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
