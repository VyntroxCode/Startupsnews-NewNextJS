import { NextResponse } from 'next/server';
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

/** Empty string (unset) tells the public page to fall back to its bundled local placeholder
 * image — unlike footer-copyright, there is no text default to fall back to here. */
export async function GET() {
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
    console.error('Error fetching public feature-startup-images setting:', error);
    return NextResponse.json({
      success: true,
      data: { step1: '', step2: '' },
    });
  }
}
