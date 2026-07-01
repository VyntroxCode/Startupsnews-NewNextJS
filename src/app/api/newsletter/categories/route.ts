import { NextResponse } from 'next/server';
import { query, queryOne } from '@/shared/database/connection';

interface RawCategory {
  id: number;
  name: string;
  slug: string;
}

const PALETTE = [
  '#e91e63', '#6366f1', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16',
  '#ec4899', '#14b8a6', '#a855f7', '#22c55e', '#0ea5e9',
];

function slugColor(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/** GET /api/newsletter/categories — public, no auth required */
export async function GET() {
  try {
    const [rows, enabledRow] = await Promise.all([
      query<RawCategory>(
        `SELECT DISTINCT c.id, c.name, c.slug
         FROM categories c
         INNER JOIN rss_feeds rf ON rf.category_id = c.id
         WHERE rf.enabled = 1
           AND FIND_IN_SET('newsletter', rf.feed_for) > 0
         ORDER BY c.name ASC`
      ),
      queryOne<{ value: string }>('SELECT value FROM site_settings WHERE `key` = ?', ['nl_morning_signal_enabled']),
    ]);

    const morningSignalEnabled = enabledRow?.value !== '0';

    const data = rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      color: slugColor(row.slug),
    }));

    return NextResponse.json({ success: true, data, morningSignalEnabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
