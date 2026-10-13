import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/modules/users/service/auth.service';
import { canEmployeeUseContent } from '@/modules/hr-credentials/domain/content-access';
import { getAuthUser, requireAnyRole, type AuthUser } from './auth.middleware';
import { requireEmployeeAuth } from './employee-auth.middleware';

type ContentAuth = { user: AuthUser; payload: JWTPayload };

/**
 * The one place an employee-portal token is accepted by admin routes: the Posts (with categories,
 * authors, Content Studio and its uploads), Reports and Brand Stories APIs, for the Employee IDs in
 * CONTENT_EMPLOYEE_CODES. Everything requireEmployeeAuth checks still applies (active credential,
 * not past the last working day). The employee is handed to the route as an 'admin'-role user so
 * the route's own role branches give the same full access the super admin has; `email` is what
 * gets stamped on created_by / updated_by.
 *
 * requireAnyRole / requireAuth themselves are unchanged and still never accept an employee token.
 */
async function contentEmployeeAuth(request: NextRequest): Promise<ContentAuth | null> {
  const auth = await requireEmployeeAuth(request);
  if (auth instanceof NextResponse) return null;
  const { credential } = auth;
  if (!canEmployeeUseContent(credential.employeeCode)) return null;

  const email = credential.email || credential.employeeCode;
  const now = new Date();
  return {
    // id 0 matches no row in `users` or `panel_admins`.
    user: { id: 0, email, name: credential.name, role: 'admin', isActive: true, createdAt: now, updatedAt: now },
    payload: { userId: 0, email, role: 'admin' },
  };
}

/** requireAnyRole, plus the allow-listed content employees. */
export async function requireContentAccess(
  request: NextRequest,
  allowedRoles: readonly string[]
): Promise<ContentAuth | NextResponse> {
  return (await contentEmployeeAuth(request)) ?? requireAnyRole(request, allowedRoles);
}

/** getAuthUser, plus the allow-listed content employees. */
export async function getContentAuthUser(
  request: NextRequest,
  formToken?: string | null
): Promise<ContentAuth | null> {
  return (await contentEmployeeAuth(request)) ?? getAuthUser(request, formToken);
}
