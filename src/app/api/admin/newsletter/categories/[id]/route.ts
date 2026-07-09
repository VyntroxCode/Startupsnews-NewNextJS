import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query, queryOne } from '@/shared/database/connection';

interface NewsletterCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
}

/** PUT /api/admin/newsletter/categories/[id] */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });

  try {
    const body = await request.json();
    const { name, slug, description, color, sort_order } = body as Partial<NewsletterCategory>;

    if (!name?.toString().trim() || !slug?.toString().trim()) {
      return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
    }

    const existing = await queryOne<{ id: number }>(
      'SELECT id FROM newsletter_categories WHERE slug = ? AND id != ?',
      [slug.toString().trim(), id]
    );
    if (existing) {
      return NextResponse.json({ success: false, error: 'A category with this slug already exists' }, { status: 409 });
    }

    await query(
      'UPDATE newsletter_categories SET name=?, slug=?, description=?, color=?, sort_order=?, updated_by=? WHERE id=?',
      [
        name.toString().trim(),
        slug.toString().trim(),
        description?.toString().trim() || null,
        color?.toString().trim() || '#6366f1',
        sort_order ?? 0,
        auth.user.email,
        id,
      ]
    );

    const row = await queryOne<NewsletterCategory>('SELECT * FROM newsletter_categories WHERE id = ?', [id]);
    if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** DELETE /api/admin/newsletter/categories/[id] */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });

  try {
    await query('DELETE FROM newsletter_categories WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
