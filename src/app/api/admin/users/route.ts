import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { UsersRepository } from '@/modules/users/repository/users.repository';

const repo = new UsersRepository();

/** GET /api/admin/users - list users for dropdowns (id, name). */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const entities = await repo.findAll({ isActive: true });
    const data = entities.map((u) => ({ id: u.id, name: u.name || u.email }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
