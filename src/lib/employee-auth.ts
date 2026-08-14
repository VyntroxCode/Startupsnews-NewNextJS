/**
 * Client-side session utilities for the plain-employee attendance dashboard (/employee/*).
 * Deliberately separate storage keys from admin-auth.ts's admin_token/admin_user so an
 * employee session can never collide with an admin session open in the same browser.
 */

export interface EmployeeUser {
  name: string;
  employeeCode: string;
}

const EMPLOYEE_TOKEN_KEY = 'employee_token';
const EMPLOYEE_USER_KEY = 'employee_user';

export function setEmployeeSession(token: string, user: EmployeeUser): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(EMPLOYEE_TOKEN_KEY, token);
  sessionStorage.setItem(EMPLOYEE_USER_KEY, JSON.stringify(user));
}

export function getEmployeeToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(EMPLOYEE_TOKEN_KEY);
}

export function getEmployeeUser(): EmployeeUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(EMPLOYEE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearEmployeeSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(EMPLOYEE_TOKEN_KEY);
  sessionStorage.removeItem(EMPLOYEE_USER_KEY);
}

export function getEmployeeAuthHeaders(): HeadersInit {
  const token = getEmployeeToken();
  if (!token) return { 'Content-Type': 'application/json' };
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
