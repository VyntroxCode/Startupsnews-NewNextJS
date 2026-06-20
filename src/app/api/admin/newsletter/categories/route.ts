import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query, queryOne, getDbConnection } from '@/shared/database/connection';

interface NewsletterCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** GET /api/admin/newsletter/categories */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const rows = await query<NewsletterCategory>(
      'SELECT * FROM newsletter_categories ORDER BY sort_order ASC, name ASC'
    );
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** POST /api/admin/newsletter/categories */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const { name, slug, description, color, sort_order } = body as {
      name: string;
      slug: string;
      description?: string;
      color?: string;
      sort_order?: number;
    };

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM newsletter_categories WHERE slug = ?',
      [slug.trim()]
    );
    if (existing) {
      return NextResponse.json({ success: false, error: 'A category with this slug already exists' }, { status: 409 });
    }

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(
        'INSERT INTO newsletter_categories (name, slug, description, color, sort_order) VALUES (?, ?, ?, ?, ?)',
        [name.trim(), slug.trim(), description?.trim() || null, color?.trim() || '#6366f1', sort_order ?? 0]
      ) as { insertId?: number };

      const row = await queryOne<NewsletterCategory>(
        'SELECT * FROM newsletter_categories WHERE id = ?',
        [result.insertId!]
      );
      return NextResponse.json({ success: true, data: row }, { status: 201 });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
