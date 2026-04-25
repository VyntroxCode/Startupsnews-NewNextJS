import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { UsersService } from '@/modules/users/service/users.service';
import { query, queryOne } from '@/shared/database/connection';
import { deleteCacheByPrefix } from '@/shared/cache/redis.client';

const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);

function mapAuthor(user: {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'author';
  avatarUrl?: string;
  authorDescription?: string;
  isDefaultAuthor?: boolean;
  isActive: boolean;
}) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    authorDescription: user.authorDescription,
    isDefaultAuthor: Boolean(user.isDefaultAuthor),
    isActive: user.isActive,
  };
}

/**
 * GET /api/admin/authors
 * List author users only
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const users = await usersService.getAllUsers({ role: 'author' });

    const filtered = users.filter((u) => {
      if (!includeInactive && !u.isActive) return false;
      if (!search) return true;
      return (
        (u.name || '').toLowerCase().includes(search) ||
        (u.authorDescription || '').toLowerCase().includes(search)
      );
    });

    filtered.sort((a, b) => {
      if (Boolean(a.isDefaultAuthor) !== Boolean(b.isDefaultAuthor)) {
        return a.isDefaultAuthor ? -1 : 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return NextResponse.json({
      success: true,
      data: filtered.map(mapAuthor),
    });
  } catch (error) {
    console.error('Error fetching authors:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch authors',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/authors
 * Create a new author user
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      name?: string;
      avatarUrl?: string;
      authorDescription?: string;
      isActive?: boolean;
      isDefaultAuthor?: boolean;
    };

    const name = (body.name || '').trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required.' },
        { status: 400 }
      );
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'author';
    const nonce = Date.now();
    const email = `${slug}-${nonce}@authors.startupnews.fyi`;
    const password = `Author-${nonce}-${Math.random().toString(36).slice(2, 10)}`;

    const created = await usersService.createUser({
      name,
      email,
      password,
      role: 'author',
      avatarUrl: (body.avatarUrl || '').trim() || undefined,
      authorDescription: (body.authorDescription || '').trim() || undefined,
    });

    if (body.isActive === false) {
      await usersService.updateUser(created.id, { id: created.id, isActive: false });
    }

    const defaultCount = await queryOne<{ count: number | bigint }>(
      'SELECT COUNT(*) AS count FROM users WHERE role = ? AND is_default_author = 1',
      ['author']
    );
    const shouldSetDefault = Boolean(body.isDefaultAuthor) || Number(defaultCount?.count || 0) === 0;

    if (shouldSetDefault) {
      await query('UPDATE users SET is_default_author = 0 WHERE role = ?', ['author']);
      await usersService.updateUser(created.id, { id: created.id, isDefaultAuthor: true });
      await deleteCacheByPrefix('user:id:');
    }

    const latest = await usersService.getUserById(created.id);

    return NextResponse.json({
      success: true,
      data: latest ? mapAuthor(latest) : mapAuthor(created),
    });
  } catch (error) {
    console.error('Error creating author:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create author',
      },
      { status: 500 }
    );
  }
}
