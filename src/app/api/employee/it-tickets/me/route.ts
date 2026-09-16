import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { employeeActor } from '@/app/api/employee/it-tickets/_lib';

/**
 * GET /api/employee/it-tickets/me — the ticket identity of the signed-in employee: { id, role, name }.
 * The IT Support page needs it to know which comments/attachments are "mine"; the employee session in
 * sessionStorage only holds { name, employeeCode }, so existing sessions keep working without a re-login.
 */
export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;

  const actor = employeeActor(auth.credential);
  return NextResponse.json({ success: true, data: { id: actor.id, role: actor.role, name: actor.name } });
}
