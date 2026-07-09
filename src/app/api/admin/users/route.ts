import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { UsersService } from '@/modules/users/service/users.service';
import { entityToUser } from '@/modules/users/utils/users.utils';
import { UserRole } from '@/modules/users/domain/types';

const repo = new UsersRepository();
const usersService = new UsersService(repo);

const ALLOWED_ROLES: UserRole[] = ['admin', 'editor', 'author'];

// Byline-author records created via /admin/authors use synthetic emails on this
// domain and aren't real admin-panel logins — exclude them from the accounts list.
const SYNTHETIC_AUTHOR_EMAIL_SUFFIX = '@authors.startupnews.fyi';

/**
 * GET /api/admin/users
 * - Default: list users for dropdowns (id, name) — used by RSS feed forms.
 * - ?full=1: full paginated list with role/status, for the admin Users management page.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;

  if (searchParams.get('full') === '1') {
    try {
      const search = searchParams.get('search')?.trim().toLowerCase() || '';
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
      const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20);

      const entities = await repo.findAll();
      let users = entities
        .map(entityToUser)
        .filter((u) => !u.email.toLowerCase().endsWith(SYNTHETIC_AUTHOR_EMAIL_SUFFIX));

      if (search) {
        users = users.filter(
          (u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
        );
      }

      const total = users.length;
      const start = (page - 1) * limit;
      const pageItems = users.slice(start, start + limit).map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin ?? null,
      }));

      return NextResponse.json({
        success: true,
        data: pageItems,
        meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Failed to fetch users' },
        { status: 500 }
      );
    }
  }

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

/** POST /api/admin/users - create a new admin-panel account (admin only). */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json() as {
      email?: string;
      password?: string;
      name?: string;
      role?: string;
    };

    const email = body.email?.trim();
    const password = body.password;
    const name = body.name?.trim();
    const role = body.role;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }
    if (!role || !ALLOWED_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { success: false, error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const user = await usersService.createUser({ email, password, name, role: role as UserRole, createdBy: auth.user.email });
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    );
  }
}
