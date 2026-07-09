import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/shared/middleware/auth.middleware';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import { PanelAdminsService } from '@/modules/panel-admins/service/panel-admins.service';
import { PanelAdminRole } from '@/modules/panel-admins/domain/types';

const repo = new PanelAdminsRepository();
const panelAdminsService = new PanelAdminsService(repo);

const ALLOWED_ROLES: PanelAdminRole[] = ['event_admin', 'publisher_admin'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/admin/panel-admins/[id] */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (isNaN(adminId)) {
    return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const admin = await panelAdminsService.getById(adminId);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Panel admin not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: admin });
  } catch (error) {
    console.error('Error fetching panel admin:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch panel admin' },
      { status: 500 }
    );
  }
}

/** PUT /api/admin/panel-admins/[id] - update name/email/role/isActive, optional password reset. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (isNaN(adminId)) {
    return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
  }

  try {
    const body = await request.json() as {
      email?: string;
      name?: string;
      role?: string;
      isActive?: boolean;
      password?: string;
    };

    if (body.role && !ALLOWED_ROLES.includes(body.role as PanelAdminRole)) {
      return NextResponse.json(
        { success: false, error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.password && body.password.trim()) {
      await panelAdminsService.updatePassword(adminId, body.password.trim());
    }

    const admin = await panelAdminsService.updatePanelAdmin(adminId, {
      id: adminId,
      email: body.email?.trim(),
      name: body.name?.trim(),
      role: body.role as PanelAdminRole | undefined,
      isActive: body.isActive,
      updatedBy: auth.user.email,
    });

    return NextResponse.json({ success: true, data: admin });
  } catch (error) {
    console.error('Error updating panel admin:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update panel admin' },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/panel-admins/[id] */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (isNaN(adminId)) {
    return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
  }

  try {
    await panelAdminsService.deletePanelAdmin(adminId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting panel admin:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete panel admin' },
      { status: 500 }
    );
  }
}
