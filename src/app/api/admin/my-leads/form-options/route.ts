import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_LEADS_PANEL_ROLES } from '@/shared/middleware/roles';
import { employeeLeadErrorResponse, employeeLeadFormOptions } from '@/modules/sales-tracker/service/http';

/** GET /api/admin/my-leads/form-options — the Add / Edit lead window's lists (see
 * /api/employee/leads/form-options) for an Event / Publisher Admin. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_LEADS_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({ success: true, data: await employeeLeadFormOptions() });
  } catch (error) {
    return employeeLeadErrorResponse(error, 'Failed to load the lead form');
  }
}
