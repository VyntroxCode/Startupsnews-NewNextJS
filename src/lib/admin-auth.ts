/**
 * Client-side admin authentication utilities
 */

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
  const token = getAdminToken();
  if (!token) return url;
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}_token=${encodeURIComponent(token)}`;
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

