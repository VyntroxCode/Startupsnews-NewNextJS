import { NextRequest, NextResponse } from 'next/server';
import { verifyEmployeeToken } from '@/modules/hr-credentials/utils/employee-jwt';
import { HrCredentialsRepository } from '@/modules/hr-credentials/repository/hr-credentials.repository';
import { HrCredentialsService } from '@/modules/hr-credentials/service/hr-credentials.service';
import { PanelAdminsRepository } from '@/modules/panel-admins/repository/panel-admins.repository';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';
import { HrOffboardingService, type PortalAccess } from '@/modules/hr-offboarding/service/hr-offboarding.service';

const hrCredentialsService = new HrCredentialsService(new HrCredentialsRepository(), new PanelAdminsRepository());
const hrOffboardingService = new HrOffboardingService();

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
 *
 * Offboarding: once an employee's last working day has passed (see hr_offboarding), a `blocked`
 * login is refused everywhere and an `alumni` login only reaches routes that pass
 * `{ allowAlumni: true }` (the read-only "My Exit" endpoints) — every other route answers 403
 * with code ALUMNI so the portal can send them to /employee/exit.
 */
export async function requireEmployeeAuth(
  request: NextRequest,
  options: { allowAlumni?: boolean } = {}
): Promise<{ credential: HrEmployeeCredential; access: PortalAccess } | NextResponse> {
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

  await hrOffboardingService.applyDueExits();
  const access = await hrOffboardingService.accessForCredential(credential.id);
  if (access === 'blocked') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (access === 'alumni' && !options.allowAlumni) {
    return NextResponse.json(
      { success: false, code: 'ALUMNI', error: 'Your last working day has passed — only My Exit is available now.' },
      { status: 403 }
    );
  }

  return { credential, access };
}
