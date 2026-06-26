import { NextResponse } from 'next/server';
import { query, queryOne } from '@/shared/database/connection';

interface NewsletterCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
}

/** GET /api/newsletter/categories — public, no auth required */
export async function GET() {
  try {
    const [rows, enabledRow] = await Promise.all([
      query<NewsletterCategory>(
        'SELECT id, name, slug, color, sort_order FROM newsletter_categories ORDER BY sort_order ASC, name ASC'
      ),
      queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', ['nl_morning_signal_enabled']),
    ]);
    // Default enabled (null = never configured = enabled)
    const morningSignalEnabled = enabledRow?.value !== '0';
    return NextResponse.json({ success: true, data: rows, morningSignalEnabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
