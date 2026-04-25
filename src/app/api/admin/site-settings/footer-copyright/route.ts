import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
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

export async function GET(request: NextRequest) {
  // Allow both editors and authors to read site settings
  const auth = await requireAuth(request, 'author');
  if (auth instanceof NextResponse) return auth;

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
    console.error('Error fetching footer copyright setting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch setting',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  const [body, parseError] = await parseJsonBody<{ value?: string }>(request);
  if (parseError) return parseError;

  const rawValue = body?.value ?? '';
  const value = rawValue.trim();

  if (!value) {
    return NextResponse.json(
      { success: false, error: 'Copyright text is required' },
      { status: 400 }
    );
  }

  if (value.length > 500) {
    return NextResponse.json(
      { success: false, error: 'Copyright text must be 500 characters or fewer' },
      { status: 400 }
    );
  }

  try {
    await ensureSiteSettingsTable();
    await query(
      `INSERT INTO site_settings (\`key\`, \`value\`)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_at = CURRENT_TIMESTAMP`,
      [SETTING_KEY, value]
    );

    return NextResponse.json({
      success: true,
      data: { value },
    });
  } catch (error) {
    console.error('Error saving footer copyright setting:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save setting',
      },
      { status: 500 }
    );
  }
}
