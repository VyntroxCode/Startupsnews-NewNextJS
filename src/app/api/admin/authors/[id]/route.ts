import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { UsersService } from '@/modules/users/service/users.service';
import { query, queryOne } from '@/shared/database/connection';
import { deleteCacheByPrefix } from '@/shared/cache/redis.client';

const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const authorId = parseInt(id, 10);
    if (isNaN(authorId)) {
      return NextResponse.json({ success: false, error: 'Invalid author ID' }, { status: 400 });
    }

    const user = await usersService.getUserById(authorId);
    if (!user || user.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Author not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, data: mapAuthor(user) },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching author:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch author' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const authorId = parseInt(id, 10);
    if (isNaN(authorId)) {
      return NextResponse.json({ success: false, error: 'Invalid author ID' }, { status: 400 });
    }

    const existing = await usersService.getUserById(authorId);
    if (!existing || existing.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Author not found' }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      avatarUrl?: string;
      authorDescription?: string;
      isActive?: boolean;
      setAsDefault?: boolean;
    };

    const updateData: {
      id: number;
      name?: string;
      avatarUrl?: string;
      authorDescription?: string;
      isActive?: boolean;
      isDefaultAuthor?: boolean;
    } = { id: authorId };

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.avatarUrl !== undefined) updateData.avatarUrl = String(body.avatarUrl).trim();
    if (body.authorDescription !== undefined) updateData.authorDescription = String(body.authorDescription).trim();
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    if (body.setAsDefault === true) {
      await query('UPDATE users SET is_default_author = 0 WHERE role = ?', ['author']);
      updateData.isDefaultAuthor = true;
      await deleteCacheByPrefix('user:id:');
    }

    await usersService.updateUser(authorId, updateData);

    const latest = await usersService.getUserById(authorId);
    return NextResponse.json({ success: true, data: latest ? mapAuthor(latest) : null });
  } catch (error) {
    console.error('Error updating author:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update author' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const authorId = parseInt(id, 10);
    if (isNaN(authorId)) {
      return NextResponse.json({ success: false, error: 'Invalid author ID' }, { status: 400 });
    }

    const existing = await usersService.getUserById(authorId);
    if (!existing || existing.role !== 'author') {
      return NextResponse.json({ success: false, error: 'Author not found' }, { status: 404 });
    }

    const postCountRow = await queryOne<{ count: number | bigint }>(
      'SELECT COUNT(*) AS count FROM posts WHERE author_id = ?',
      [authorId]
    );
    const postCount = Number(postCountRow?.count || 0);

    if (postCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `This author is assigned to ${postCount} post(s). Reassign those posts before removing the author.`,
        },
        { status: 400 }
      );
    }

    await usersService.deleteUser(authorId);

    if (existing.isDefaultAuthor) {
      const nextDefault = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE role = ? ORDER BY is_active DESC, id ASC LIMIT 1',
        ['author']
      );
      if (nextDefault?.id) {
        await usersService.updateUser(nextDefault.id, { id: nextDefault.id, isDefaultAuthor: true });
        await deleteCacheByPrefix('user:id:');
      }
    }

    return NextResponse.json({ success: true, message: 'Author removed successfully' });
  } catch (error) {
    console.error('Error deleting author:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete author' },
      { status: 500 }
    );
  }
}
