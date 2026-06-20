import { NextResponse } from 'next/server';
import { query } from '@/shared/database/connection';

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
    const rows = await query<NewsletterCategory>(
      'SELECT id, name, slug, color, sort_order FROM newsletter_categories ORDER BY sort_order ASC, name ASC'
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
