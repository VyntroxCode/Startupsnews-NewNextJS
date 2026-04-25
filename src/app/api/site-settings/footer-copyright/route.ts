import { NextResponse } from 'next/server';
import { query, queryOne } from '@/shared/database/connection';

export const maxDuration = 30;

const SETTING_KEY = 'footer_copyright_text';
const DEFAULT_TEXT = '© {{year}} Dotfyi Media Ventures Pvt Ltd';

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

export async function GET() {
  try {
    await ensureSiteSettingsTable();
    const row = await queryOne<{ value: string | null }>(
      'SELECT \`value\` FROM site_settings WHERE \`key\` = ? LIMIT 1',
      [SETTING_KEY]
    );

    return NextResponse.json({
      success: true,
      data: {
        value: row?.value ?? DEFAULT_TEXT,
      },
    });
  } catch (error) {
    console.error('Error fetching public footer copyright setting:', error);
    return NextResponse.json({
      success: true,
      data: {
        value: DEFAULT_TEXT,
      },
    });
  }
}
