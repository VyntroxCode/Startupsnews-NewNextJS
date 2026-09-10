import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { query } from '@/shared/database/connection';

export const maxDuration = 30;

const KEY_STEP1 = 'feature_startup_hero_step1';
const KEY_STEP2 = 'feature_startup_hero_step2';

async function ensureSiteSettingsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(120) NOT NULL UNIQUE,
      \`value\` TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'author');
  if (auth instanceof NextResponse) return auth;

  try {
    await ensureSiteSettingsTable();
    const rows = await query<{ key: string; value: string | null }>(
      'SELECT `key`, `value` FROM site_settings WHERE `key` IN (?, ?)',
      [KEY_STEP1, KEY_STEP2]
    );
    const byKey = new Map(rows.map((r) => [r.key, r.value || '']));

    return NextResponse.json({
      success: true,
      data: {
        step1: byKey.get(KEY_STEP1) || '',
        step2: byKey.get(KEY_STEP2) || '',
      },
    });
  } catch (error) {
    console.error('Error fetching feature-startup-images setting:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch setting' },
      { status: 500 }
    );
  }
}

/** Values are expected to be CDN URLs from the admin image-upload flow (`/api/admin/presign` →
 * `images.startupnews.fyi`), same as every other admin-uploaded image on the site. An empty string
 * clears the override and puts the public page back on its bundled local placeholder. */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  const [body, parseError] = await parseJsonBody<{ step1?: string; step2?: string }>(request);
  if (parseError) return parseError;

  const step1 = (body?.step1 ?? '').trim();
  const step2 = (body?.step2 ?? '').trim();

  for (const [label, value] of [['step1', step1], ['step2', step2]] as const) {
    if (value && !/^https?:\/\//i.test(value)) {
      return NextResponse.json(
        { success: false, error: `${label} must be a full image URL (or left blank to clear it).` },
        { status: 400 }
      );
    }
  }

  try {
    await ensureSiteSettingsTable();
    await query(
      `INSERT INTO site_settings (\`key\`, \`value\`) VALUES (?, ?), (?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_at = CURRENT_TIMESTAMP`,
      [KEY_STEP1, step1, KEY_STEP2, step2]
    );

    return NextResponse.json({ success: true, data: { step1, step2 } });
  } catch (error) {
    console.error('Error saving feature-startup-images setting:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save setting' },
      { status: 500 }
    );
  }
}
