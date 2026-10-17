import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { MY_PAYSLIPS_PANEL_ROLES } from '@/shared/middleware/roles';
import { hrToolService, getEmployeeCodes } from '@/app/api/admin/hr-tool/_lib';
import { hrCredentialsService } from '@/app/api/admin/my-exit/_lib';

/** GET /api/admin/my-payslips — the Publisher/Event Admin's own frozen payslips, the admin-panel twin
 * of /api/employee/payslips. The panel login is matched to its HR credential (linked panel admin),
 * then to the HR directory employee; no link → an empty list. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, MY_PAYSLIPS_PANEL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const credential = await hrCredentialsService.getByLinkedPanelAdminId(auth.user.id);
    if (!credential) return NextResponse.json({ success: true, data: [] });
    const employee = await hrToolService.resolveEmployeeForCredential(credential.id, credential.name);
    if (!employee) return NextResponse.json({ success: true, data: [] });
    const payslips = await hrToolService.getEmployeePayslips(employee.id, await getEmployeeCodes());
    return NextResponse.json({ success: true, data: payslips });
  } catch (error) {
    console.error('Error loading own payslips (panel admin):', error);
    return NextResponse.json({ success: false, error: 'Failed to load payslips' }, { status: 500 });
  }
}
