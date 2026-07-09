import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { UsersService } from '@/modules/users/service/users.service';
import { UserRole } from '@/modules/users/domain/types';

const repo = new UsersRepository();
const usersService = new UsersService(repo);

const ALLOWED_ROLES: UserRole[] = ['admin', 'editor', 'author'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/users/[id] */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const user = await usersService.getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

/** PUT /api/admin/users/[id] - update name/email/role/isActive, optional password reset. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
  }

  try {
    const body = await request.json() as {
      email?: string;
      name?: string;
      role?: string;
      isActive?: boolean;
      password?: string;
    };

    if (body.role && !ALLOWED_ROLES.includes(body.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.password && body.password.trim()) {
      await usersService.updatePassword(userId, body.password.trim());
    }

    const user = await usersService.updateUser(userId, {
      id: userId,
      email: body.email?.trim(),
      name: body.name?.trim(),
      role: body.role as UserRole | undefined,
      isActive: body.isActive,
      updatedBy: auth.user.email,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/users/[id] */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
  }

  if (auth.user.id === userId) {
    return NextResponse.json(
      { success: false, error: 'You cannot delete your own account' },
      { status: 400 }
    );
  }

  try {
    await usersService.deleteUser(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    );
  }
}
