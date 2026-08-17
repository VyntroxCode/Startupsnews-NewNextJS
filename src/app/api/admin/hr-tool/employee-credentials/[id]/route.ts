import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { HrCredentialDesignation } from '@/modules/hr-credentials/domain/types';
import { PanelAdminRole } from '@/modules/panel-admins/domain/types';
import { hrCredentialsService, hrToolService } from '../_lib';

const ALLOWED_PANEL_ROLES: PanelAdminRole[] = ['event_admin', 'publisher_admin'];

interface UpdateBody {
  name?: string;
  designation?: string;
  email?: string | null;
  avatarUrl?: string | null;
  password?: string;
  panelRole?: string | null;
  linkedPanelAdminId?: number | null;
  isActive?: boolean;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/hr-tool/employee-credentials/[id] */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const credentialId = parseInt(id, 10);
  if (isNaN(credentialId)) {
    return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const credential = await hrCredentialsService.getById(credentialId);
    if (!credential) {
      return NextResponse.json({ success: false, error: 'Employee credential not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: credential });
  } catch (error) {
    console.error('Error fetching HR employee credential:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch employee credential' },
      { status: 500 }
    );
  }
}

/** PUT /api/admin/hr-tool/employee-credentials/[id] — blank password field = keep existing. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const credentialId = parseInt(id, 10);
  if (isNaN(credentialId)) {
    return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const [body, errorResponse] = await parseJsonBody<UpdateBody>(request);
    if (errorResponse) return errorResponse;

    if (body?.password && body.password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (body?.designation) {
      const allowedDesignations = await hrToolService.getDesignations();
      if (!allowedDesignations.includes(body.designation)) {
        return NextResponse.json({ success: false, error: `Designation must be one of: ${allowedDesignations.join(', ')}` }, { status: 400 });
      }
    }
    if (body?.panelRole && !ALLOWED_PANEL_ROLES.includes(body.panelRole as PanelAdminRole)) {
      return NextResponse.json({ success: false, error: `Role must be one of: ${ALLOWED_PANEL_ROLES.join(', ')}` }, { status: 400 });
    }

    const credential = await hrCredentialsService.update(credentialId, {
      name: body?.name?.trim(),
      designation: body?.designation as HrCredentialDesignation | undefined,
      email: body?.email !== undefined ? (body.email?.trim() || null) : undefined,
      avatarUrl: body?.avatarUrl !== undefined ? (body.avatarUrl?.trim() || null) : undefined,
      password: body?.password || undefined,
      panelRole: body?.panelRole !== undefined ? (body.panelRole as PanelAdminRole | null) : undefined,
      linkedPanelAdminId: body?.linkedPanelAdminId !== undefined ? body.linkedPanelAdminId : undefined,
      isActive: body?.isActive,
      updatedBy: auth.user.email,
    });
    return NextResponse.json({ success: true, data: credential });
  } catch (error) {
    console.error('Error updating HR employee credential:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update employee credential' },
      { status: 400 }
    );
  }
}

/** DELETE /api/admin/hr-tool/employee-credentials/[id] */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const credentialId = parseInt(id, 10);
  if (isNaN(credentialId)) {
    return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await hrCredentialsService.delete(credentialId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting HR employee credential:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete employee credential' },
      { status: 500 }
    );
  }
}
