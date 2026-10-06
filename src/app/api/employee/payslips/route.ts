import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { hrToolService, getEmployeeCodes } from '@/app/api/admin/hr-tool/_lib';

/** GET /api/employee/payslips — the logged-in employee's own published payslips: one per FROZEN
 * payroll month, newest first, each with the snapshot the PDF is drawn from
 * (HrToolService.getEmployeePayslips). Draft or reversed months are never listed. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { credential } = auth;
    const employee = await hrToolService.resolveEmployeeForCredential(credential.id, credential.name);
    if (!employee) return NextResponse.json({ success: true, data: [] });
    const payslips = await hrToolService.getEmployeePayslips(employee.id, await getEmployeeCodes());
    return NextResponse.json({ success: true, data: payslips });
  } catch (error) {
    console.error('Error loading own payslips:', error);
    return NextResponse.json({ success: false, error: 'Failed to load payslips' }, { status: 500 });
  }
}
