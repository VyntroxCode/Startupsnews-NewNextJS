import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { employeeLeadErrorResponse, employeeLeadFormOptions } from '@/modules/sales-tracker/service/http';

/** GET /api/employee/leads/form-options — what the Add / Edit lead window on My Leads needs: the
 * employees and departments a lead can be assigned to (the same lists the admin Sales Tracker
 * offers) and the City suggestions. */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({ success: true, data: await employeeLeadFormOptions() });
  } catch (error) {
    return employeeLeadErrorResponse(error, 'Failed to load the lead form');
  }
}
