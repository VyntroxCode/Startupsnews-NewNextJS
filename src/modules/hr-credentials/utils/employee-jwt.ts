import jwt, { SignOptions } from 'jsonwebtoken';
import type { HrEmployeeCredential } from '../domain/types';

/**
 * Isolated JWT for plain HR employees (no linked panel_admins account) logging in from
 * the admin login page's Employee ID tab. Deliberately NOT the same shape as the admin
 * panel's JWTPayload ({ userId, email, role }) — no `role` field at all, so this token
 * can never be accepted by requireAnyRole/hasRole even if it ended up on that code path.
 * Verified only by requireEmployeeAuth, which nothing else in the app calls.
 */
export interface EmployeeJwtPayload {
  credentialId: number;
  employeeCode: string;
  type: 'hr_employee';
}

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const EMPLOYEE_JWT_EXPIRES_IN: string = process.env.EMPLOYEE_JWT_EXPIRES_IN || '12h';

export function signEmployeeToken(credential: HrEmployeeCredential): string {
  const payload: EmployeeJwtPayload = {
    credentialId: credential.id,
    employeeCode: credential.employeeCode,
    type: 'hr_employee',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: EMPLOYEE_JWT_EXPIRES_IN } as SignOptions);
}

export function verifyEmployeeToken(token: string): EmployeeJwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as EmployeeJwtPayload;
    if (decoded?.type !== 'hr_employee') return null;
    return decoded;
  } catch {
    return null;
  }
}
