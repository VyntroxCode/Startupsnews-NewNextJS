import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { PanelAdminRole } from '@/modules/panel-admins/domain/types';
import { hrCredentialsService } from '../_lib';

const ALLOWED_PANEL_ROLES: PanelAdminRole[] = ['event_admin', 'publisher_admin'];

/**
 * GET /api/admin/hr-tool/employee-credentials/available-panel-admins?role=publisher_admin&excludeCredentialId=3
 * Lists panel_admins accounts of the given role not already linked to another credential —
 * feeds the "link to existing account" dropdown in the Assigning IDs form.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const role = searchParams.get('role');
    const excludeCredentialId = searchParams.get('excludeCredentialId');

    if (!role || !ALLOWED_PANEL_ROLES.includes(role as PanelAdminRole)) {
      return NextResponse.json({ success: false, error: `role must be one of: ${ALLOWED_PANEL_ROLES.join(', ')}` }, { status: 400 });
    }

    const admins = await hrCredentialsService.getAvailablePanelAdmins(
      role as PanelAdminRole,
      excludeCredentialId ? parseInt(excludeCredentialId, 10) : undefined
    );
    return NextResponse.json({ success: true, data: admins });
  } catch (error) {
    console.error('Error fetching available panel admins:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch available accounts' },
      { status: 500 }
    );
  }
}
