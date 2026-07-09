import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/users/service/auth.service';
import { UsersService } from '@/modules/users/service/users.service';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { PanelAdminsService } from '@/modules/panel-admins/service/panel-admins.service';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';

// Initialize services
const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const panelAdminsRepository = new PanelAdminsRepository();
const panelAdminsService = new PanelAdminsService(panelAdminsRepository);
const authService = new AuthService(usersService, panelAdminsService);

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

    // Allow admin, editor, author, event_admin, and publisher_admin roles to login to admin panel
    const allowedLoginRoles = ['admin', 'editor', 'author', 'event_admin', 'publisher_admin'];
    if (!allowedLoginRoles.includes(result.user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. Insufficient role permissions.',
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

