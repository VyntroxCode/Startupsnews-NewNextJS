import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { IT_TICKETS_MANAGE_ROLES } from '@/shared/middleware/roles';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';

/**
 * GET /api/admin/it-tickets/assignees — who a ticket can be assigned to (admin + IT Support).
 * Manage-roles only, since only they ever set the assignee field.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, IT_TICKETS_MANAGE_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [admins, itSupport] = await Promise.all([
      new UsersRepository().findAll({ role: 'admin', isActive: true }),
      new PanelAdminsRepository().findAll({ role: 'it_support', isActive: true }),
    ]);

    const assignees = [
      ...admins.map((u) => ({ id: u.id, role: u.role, name: u.name })),
      ...itSupport.map((p) => ({ id: p.id, role: p.role, name: p.name })),
    ];

    return NextResponse.json({ success: true, data: assignees });
  } catch (error) {
    console.error('Error listing IT ticket assignees:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list assignees' },
      { status: 500 }
    );
  }
}
