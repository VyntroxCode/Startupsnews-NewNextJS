import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/users/service/auth.service';
import { UsersService } from '@/modules/users/service/users.service';
import { UsersRepository } from '@/modules/users/repository/users.repository';

// Initialize services
const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const authService = new AuthService(usersService);

/**
 * POST /api/admin/auth/login
 * Admin login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        { status: 400 }
      );
    }

    const result = await authService.login(email, password);

    // Allow admin, editor, and author roles to login to admin panel
    if (result.user.role !== 'admin' && result.user.role !== 'editor' && result.user.role !== 'author') {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. Admin, editor, or author role required.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      },
      { status: 401 }
    );
  }
}

