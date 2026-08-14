import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrCredentialDesignation } from '@/modules/hr-credentials/domain/types';
import { PanelAdminRole } from '@/modules/panel-admins/domain/types';
import { hrCredentialsService } from './_lib';

const ALLOWED_DESIGNATIONS: HrCredentialDesignation[] = ['HR Head', 'Reporting Manager', 'Employee'];
const ALLOWED_PANEL_ROLES: PanelAdminRole[] = ['event_admin', 'publisher_admin'];

interface CreateBody {
  employeeCode?: string;
  name?: string;
  designation?: string;
  email?: string;
  avatarUrl?: string;
  password?: string;
  panelRole?: string;
  linkedPanelAdminId?: number;
}

/** GET /api/admin/hr-tool/employee-credentials — list all Assigning-IDs credentials. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credentials = await hrCredentialsService.getAll();
    return NextResponse.json({ success: true, data: credentials });
  } catch (error) {
    console.error('Error fetching HR employee credentials:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch employee credentials' },
      { status: 500 }
    );
  }
}

/** POST /api/admin/hr-tool/employee-credentials — create an Employee ID + password credential. */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<CreateBody>(request);
    if (errorResponse) return errorResponse;

    const employeeCode = body?.employeeCode?.trim();
    const name = body?.name?.trim();
    const designation = body?.designation;
    const password = body?.password;

    if (!employeeCode || !name || !password) {
      return NextResponse.json({ success: false, error: 'Employee ID, name, and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!designation || !ALLOWED_DESIGNATIONS.includes(designation as HrCredentialDesignation)) {
      return NextResponse.json({ success: false, error: `Designation must be one of: ${ALLOWED_DESIGNATIONS.join(', ')}` }, { status: 400 });
    }
    if (body?.panelRole && !ALLOWED_PANEL_ROLES.includes(body.panelRole as PanelAdminRole)) {
      return NextResponse.json({ success: false, error: `Role must be one of: ${ALLOWED_PANEL_ROLES.join(', ')}` }, { status: 400 });
    }

    const credential = await hrCredentialsService.create({
      employeeCode,
      name,
      designation: designation as HrCredentialDesignation,
      email: body?.email?.trim() || null,
      avatarUrl: body?.avatarUrl?.trim() || null,
      password,
      panelRole: (body?.panelRole as PanelAdminRole) || null,
      linkedPanelAdminId: body?.linkedPanelAdminId || null,
      createdBy: auth.user.email,
    });
    return NextResponse.json({ success: true, data: credential });
  } catch (error) {
    console.error('Error creating HR employee credential:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create employee credential' },
      { status: 400 }
    );
  }
}
