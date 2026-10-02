import { NextRequest, NextResponse } from 'next/server';
import { requireEmployeeAuth } from '@/shared/middleware/employee-auth.middleware';
import { canEmployeeUseDirectory } from '@/modules/contacts/domain/directory-access';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';

/** Employee login + the Directory allow-list. Allow-listed employees get full access (same as the super admin). */
export async function requireDirectoryEmployee(request: NextRequest): Promise<{ credential: HrEmployeeCredential } | NextResponse> {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!canEmployeeUseDirectory(auth.credential.employeeCode)) {
    return NextResponse.json({ success: false, error: 'You do not have access to the Directory' }, { status: 403 });
  }
  return { credential: auth.credential };
}

/** Stamped on created/updated contacts — the employee's email, or their Employee ID when no email is on file. */
export function directoryActor(credential: HrEmployeeCredential): string {
  return credential.email || credential.employeeCode;
}
