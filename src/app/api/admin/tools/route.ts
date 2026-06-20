import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { query, getDbConnection } from '@/shared/database/connection';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

/** GET /api/admin/tools — list all uploaded tools */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const rows = await query<{ id: bigint | number; name: string; slug: string; created_at: string; updated_at: string }>(
      'SELECT id, name, slug, created_at, updated_at FROM admin_tools ORDER BY created_at DESC'
    );
    const data = rows.map(r => ({ ...r, id: Number(r.id) }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** POST /api/admin/tools — upload a new HTML tool */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json() as { name: string; html_content: string };
    const { name, html_content } = body;
    if (!name?.trim()) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    if (!html_content?.trim()) return NextResponse.json({ success: false, error: 'HTML content is required' }, { status: 400 });

    let slug = toSlug(name.trim());
    // Ensure slug uniqueness
    const existing = await query<{ slug: string }>('SELECT slug FROM admin_tools WHERE slug LIKE ?', [`${slug}%`]);
    if (existing.length) {
      const taken = new Set(existing.map(r => r.slug));
      let i = 2;
      while (taken.has(slug)) { slug = `${toSlug(name.trim())}-${i++}`; }
    }

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(
        'INSERT INTO admin_tools (name, slug, html_content) VALUES (?, ?, ?)',
        [name.trim(), slug, html_content.trim()]
      ) as { insertId?: bigint | number };
      return NextResponse.json({ success: true, data: { id: Number(result.insertId), slug } });
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
