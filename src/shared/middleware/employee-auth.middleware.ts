import { NextRequest, NextResponse } from 'next/server';
import { verifyEmployeeToken } from '@/modules/hr-credentials/utils/employee-jwt';
import { HrCredentialsRepository } from '@/modules/hr-credentials/repository/hr-credentials.repository';
import { HrCredentialsService } from '@/modules/hr-credentials/service/hr-credentials.service';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';

const hrCredentialsService = new HrCredentialsService(new HrCredentialsRepository(), new PanelAdminsRepository());

function getEmployeeTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const t = authHeader.substring(7).trim();
    if (t) return t;
  }
  const xToken = request.headers.get('x-employee-token');
  if (xToken?.trim()) return xToken.trim();
  return null;
}

/**
 * Auth guard for the isolated plain-employee attendance endpoints. Completely separate
 * from requireAuth/requireAnyRole (src/shared/middleware/auth.middleware.ts) — an employee
 * token has no `role` claim and is never accepted there, and this guard never resolves
 * against `users`/`panel_admins`, only `hr_employee_credentials`.
 */
export async function requireEmployeeAuth(
  request: NextRequest
): Promise<{ credential: HrEmployeeCredential } | NextResponse> {
  const token = getEmployeeTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyEmployeeToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Load fresh (not trusting the token's snapshot) so a since-deactivated credential is rejected immediately.
  const credential = await hrCredentialsService.getById(payload.credentialId);
  if (!credential || !credential.isActive || credential.employeeCode !== payload.employeeCode) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  return { credential };
}
