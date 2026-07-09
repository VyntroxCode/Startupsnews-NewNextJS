import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireAnyRole } from '@/shared/middleware/auth.middleware';
import { TOOLS_VIEW_ROLES } from '@/shared/middleware/roles';
import { query, getDbConnection } from '@/shared/database/connection';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

interface ToolListRow {
  id: bigint | number;
  name: string;
  slug: string;
  visible_to_event_admin: boolean | number;
  visible_to_publisher_admin: boolean | number;
  created_at: string;
  updated_at: string;
}

/** GET /api/admin/tools — list tools. Admin/editor see all; Event Admin/Publisher Admin only see tools shared with them. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, TOOLS_VIEW_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await query<ToolListRow>(
      'SELECT id, name, slug, visible_to_event_admin, visible_to_publisher_admin, created_at, updated_at FROM admin_tools ORDER BY created_at DESC'
    );

    const role = auth.user.role;
    const visible = rows.filter((r) => {
      if (role === 'event_admin') return Boolean(r.visible_to_event_admin);
      if (role === 'publisher_admin') return Boolean(r.visible_to_publisher_admin);
      return true; // admin, editor
    });

    const data = visible.map((r) => ({
      id: Number(r.id),
      name: r.name,
      slug: r.slug,
      visibleToEventAdmin: Boolean(r.visible_to_event_admin),
      visibleToPublisherAdmin: Boolean(r.visible_to_publisher_admin),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** POST /api/admin/tools — upload a new HTML tool (admin only) */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json() as {
      name: string;
      html_content: string;
      visibleToEventAdmin?: boolean;
      visibleToPublisherAdmin?: boolean;
    };
    const { name, html_content, visibleToEventAdmin, visibleToPublisherAdmin } = body;
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
        'INSERT INTO admin_tools (name, slug, html_content, visible_to_event_admin, visible_to_publisher_admin, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name.trim(), slug, html_content.trim(), Boolean(visibleToEventAdmin), Boolean(visibleToPublisherAdmin), auth.user.email, auth.user.email]
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
