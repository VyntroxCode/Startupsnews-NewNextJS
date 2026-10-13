/**
 * Client-side admin authentication utilities
 */

import { getEmployeeToken, getEmployeeUser } from '@/lib/employee-auth';
import { canEmployeeUseContent, isContentPortalPath } from '@/modules/hr-credentials/domain/content-access';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';
const ADMIN_TOKEN_COOKIE = 'admin_token';
const ADMIN_LAST_ACTIVITY_KEY = 'admin_last_activity';
const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  // Session cookie (no Max-Age/Expires): removed automatically when browser closes.
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * The employee portal mounts the admin Posts / Reports / Brand Stories screens for the Employee IDs
 * in CONTENT_EMPLOYEE_CODES (/employee/posts, /employee/reports, …). On those routes the screens run
 * on the employee's own session: their token goes out with every request, and they are shown as an
 * 'admin' so every control renders. The API re-checks the allow-list (requireContentAccess). Checked
 * before any admin session so a stale admin_token cookie in the same browser cannot get in the way.
 */
function getContentEmployeeSession(): { token: string; user: AdminUser } | null {
  if (typeof window === 'undefined' || !isContentPortalPath(window.location.pathname)) return null;
  const token = getEmployeeToken();
  const employee = getEmployeeUser();
  if (!token || !employee || !canEmployeeUseContent(employee.employeeCode)) return null;
  return { token, user: { id: 0, email: employee.employeeCode, name: employee.name, role: 'admin' } };
}

export function setAdminSession(token: string, user: AdminUser): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  updateLastActivity();
  setCookie(ADMIN_TOKEN_COOKIE, token);
}

/**
 * Get stored admin token
 */
export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  const contentEmployee = getContentEmployeeSession();
  if (contentEmployee) return contentEmployee.token;
  const sessionToken = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  const cookieToken = getCookie(ADMIN_TOKEN_COOKIE);

  if (sessionToken && sessionToken !== cookieToken) {
    setCookie(ADMIN_TOKEN_COOKIE, sessionToken);
  }

  return sessionToken || cookieToken;
}

/**
 * Get stored admin user
 */
export function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const contentEmployee = getContentEmployeeSession();
  if (contentEmployee) return contentEmployee.user;
  const userStr = sessionStorage.getItem(ADMIN_USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAdminToken();
}

/**
 * Clear admin session
 */
export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
  sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
  deleteCookie(ADMIN_TOKEN_COOKIE);
}

export function updateLastActivity(now: number = Date.now()): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(now));
}

export function getLastActivity(): number | null {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem(ADMIN_LAST_ACTIVITY_KEY);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isSessionIdle(now: number = Date.now()): boolean {
  const lastActivity = getLastActivity();
  if (!lastActivity) return false;
  return now - lastActivity >= ADMIN_IDLE_TIMEOUT_MS;
}

export function getIdleTimeoutMs(): number {
  return ADMIN_IDLE_TIMEOUT_MS;
}

/**
 * Get headers for admin API requests.
 * Sends token in both Authorization and X-Admin-Token so auth works when proxies strip Authorization on GET.
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  if (!token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Admin-Token': token,
    'X-Access-Token': token,
  };
}

/**
 * Add token query param fallback for environments where edge proxies/WAF
 * occasionally strip auth headers on admin API requests.
 */
export function withAdminToken(url: string): string {
  // Tokens no longer travel in URLs (they leaked into access and CDN logs). The server reads
  // the Authorization header or the admin_token cookie; this keeps the call sites unchanged.
  getAdminToken(); // re-syncs the cookie from sessionStorage when they differ
  return url;
}

/**
 * Verify token with server
 */
export async function verifyToken(): Promise<AdminUser | null> {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const response = await fetch('/api/admin/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Admin-Token': token,
        'X-Access-Token': token,
      },
    });

    const data = await response.json();
    if (data.success && data.data?.user) {
      return data.data.user;
    }
    return null;
  } catch {
    return null;
  }
}

