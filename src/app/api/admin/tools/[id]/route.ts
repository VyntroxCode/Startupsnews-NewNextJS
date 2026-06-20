import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { queryOne, query } from '@/shared/database/connection';

interface ToolRow {
  id: bigint | number;
  name: string;
  slug: string;
  html_content: string;
  created_at: string;
  updated_at: string;
}

/** GET /api/admin/tools/[id] — serve raw HTML (opens as a full page) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const row = await queryOne<ToolRow>(
      'SELECT * FROM admin_tools WHERE id = ? OR slug = ?',
      [isNaN(Number(id)) ? 0 : Number(id), id]
    );
    if (!row) return NextResponse.json({ success: false, error: 'Tool not found' }, { status: 404 });

    // Serve as full HTML page
    return new NextResponse(row.html_content, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/** DELETE /api/admin/tools/[id] — delete a tool */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    await query('DELETE FROM admin_tools WHERE id = ?', [Number(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
