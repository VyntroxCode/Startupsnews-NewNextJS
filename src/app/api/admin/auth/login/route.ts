import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/users/service/auth.service';
import { UsersService } from '@/modules/users/service/users.service';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { PanelAdminsService } from '@/modules/panel-admins/service/panel-admins.service';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import { HrCredentialsService } from '@/modules/hr-credentials/service/hr-credentials.service';
import { HrCredentialsRepository } from '@/modules/hr-credentials/repository/hr-credentials.repository';
import { signEmployeeToken } from '@/modules/hr-credentials/utils/employee-jwt';

// Initialize services
const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const panelAdminsRepository = new PanelAdminsRepository();
const panelAdminsService = new PanelAdminsService(panelAdminsRepository);
const authService = new AuthService(usersService, panelAdminsService);
const hrCredentialsService = new HrCredentialsService(new HrCredentialsRepository(), panelAdminsRepository);

const INVALID_EMPLOYEE_CREDENTIALS = { success: false, error: 'Invalid Employee ID or password' } as const;

/**
 * POST /api/admin/auth/login
 * Admin login — email/password, or Employee ID/password (which branches: an ID linked to
 * a Publisher/Event Admin account signs into the admin panel as before; a plain HR
 * employee ID (no linked account) signs into their own isolated attendance dashboard).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, employeeId } = body;

    if (!password || (!email && !employeeId)) {
      return NextResponse.json(
        {
          success: false,
          error: employeeId !== undefined
            ? 'Employee ID and password are required'
            : 'Email and password are required',
        },
        { status: 400 }
      );
    }

    if (employeeId) {
      const credential = await hrCredentialsService.getByEmployeeCode(employeeId);
      if (!credential) {
        return NextResponse.json(INVALID_EMPLOYEE_CREDENTIALS, { status: 401 });
      }

      if (credential.linkedPanelAdmin) {
        // Linked to a Publisher Admin / Event Admin account — signs into the admin panel, as before.
        const result = await authService.loginWithEmployeeId(employeeId, password);
        const allowedLoginRoles = ['admin', 'editor', 'author', 'event_admin', 'publisher_admin'];
        if (!allowedLoginRoles.includes(result.user.role)) {
          return NextResponse.json(
            { success: false, error: 'Access denied. Insufficient role permissions.' },
            { status: 403 }
          );
        }
        return NextResponse.json({ success: true, data: { ...result, accountType: 'admin' } });
      }

      // No linked account — a plain HR employee, authenticated directly against their own
      // credential and issued an isolated token for the /employee/attendance dashboard.
      const verified = await hrCredentialsService.verifyEmployeePassword(employeeId, password);
      if (!verified) {
        return NextResponse.json(INVALID_EMPLOYEE_CREDENTIALS, { status: 401 });
      }
      const token = signEmployeeToken(verified);
      return NextResponse.json({
        success: true,
        data: { accountType: 'employee', token, user: { name: verified.name, employeeCode: verified.employeeCode } },
      });
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
      data: { ...result, accountType: 'admin' },
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
