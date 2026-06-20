import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query, queryOne } from '@/shared/database/connection';

const KEYS = ['nl_smtp_host', 'nl_smtp_port', 'nl_smtp_secure', 'nl_smtp_user', 'nl_smtp_pass', 'nl_smtp_from'] as const;

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

/** GET /api/admin/newsletter/mail-config */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const [host, port, secure, user, pass, from] = await Promise.all(KEYS.map(getSetting));
    return NextResponse.json({
      success: true,
      data: {
        host: host ?? process.env.SMTP_HOST ?? '',
        port: port ?? process.env.SMTP_PORT ?? '465',
        secure: secure ?? process.env.SMTP_SECURE ?? 'true',
        user: user ?? process.env.SMTP_USER ?? '',
        pass: pass ? '••••••••' : (process.env.SMTP_PASS ? '••••••••' : ''),
        from: from ?? process.env.SMTP_FROM ?? '',
        // whether it's from DB or env
        source: host ? 'db' : 'env',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/** POST /api/admin/newsletter/mail-config */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json() as {
      host: string; port: string; secure: string;
      user: string; pass?: string; from: string;
    };

    await setSetting('nl_smtp_host', body.host.trim());
    await setSetting('nl_smtp_port', body.port.trim());
    await setSetting('nl_smtp_secure', body.secure);
    await setSetting('nl_smtp_user', body.user.trim());
    if (body.pass && body.pass !== '••••••••') {
      await setSetting('nl_smtp_pass', body.pass);
    }
    await setSetting('nl_smtp_from', body.from.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
