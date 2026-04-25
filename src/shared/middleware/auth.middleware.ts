import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/modules/users/service/auth.service';
import { UsersService } from '@/modules/users/service/users.service';
import { UsersRepository } from '@/modules/users/repository/users.repository';
import { JWTPayload } from '@/modules/users/service/auth.service';
import { User } from '@/modules/users/domain/types';

// Initialize services
const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const authService = new AuthService(usersService);

/**
 * Get token from request.
 * Checks: Authorization Bearer, X-Admin-Token (fallback when proxies strip Authorization on GET), form body, JSON body _token.
 */
function getTokenFromRequest(request: NextRequest, formToken?: string | null): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const t = authHeader.substring(7).trim();
    if (t) return t;
  }
  const altAuthHeader = request.headers.get('Authorization');
  if (altAuthHeader && altAuthHeader.startsWith('Bearer ')) {
    const t = altAuthHeader.substring(7).trim();
    if (t) return t;
  }
  const xToken = request.headers.get('x-admin-token');
  if (xToken && typeof xToken === 'string' && xToken.trim()) return xToken.trim();
  const xAccessToken = request.headers.get('x-access-token');
  if (xAccessToken && typeof xAccessToken === 'string' && xAccessToken.trim()) return xAccessToken.trim();
  const cookieToken = request.cookies.get('admin_token')?.value;
  if (cookieToken && cookieToken.trim()) return cookieToken.trim();
  if (formToken && typeof formToken === 'string' && formToken.trim()) return formToken.trim();

  // Fallback to URL parameters if headers are stripped by proxy/WAF
  const queryToken = request.nextUrl?.searchParams?.get('_token');
  if (queryToken && queryToken.trim()) return queryToken.trim();
  const queryTokenAlt = request.nextUrl?.searchParams?.get('token');
  if (queryTokenAlt && queryTokenAlt.trim()) return queryTokenAlt.trim();
  const queryAdminToken = request.nextUrl?.searchParams?.get('admin_token');
  if (queryAdminToken && queryAdminToken.trim()) return queryAdminToken.trim();

  return null;
}

/**
 * Get user from a token string (e.g. from form body when Authorization header is stripped on multipart)
 */
export async function getAuthUserFromToken(token: string): Promise<{
  user: User;
  payload: JWTPayload;
} | null> {
  try {
    if (!token || !token.trim()) return null;
    const payload = authService.verifyToken(token);
    if (!payload) return null;
    const user = await usersService.getUserById(payload.userId);
    if (!user || !user.isActive) return null;
    return { user, payload };
  } catch {
    return null;
  }
}

/**
 * Get user from request token (header or, for multipart, from form field _token)
 */
export async function getAuthUser(
  request: NextRequest,
  formToken?: string | null
): Promise<{
  user: User;
  payload: JWTPayload;
} | null> {
  try {
    const token = getTokenFromRequest(request, formToken);
    if (!token) {
      console.error('[Auth] No token (header or form)', {
        hasAuthHeader: !!request.headers.get('authorization'),
        hasFormToken: !!formToken,
      });
      return null;
    }
    return getAuthUserFromToken(token);
  } catch (error) {
    console.error('[Auth] Error in getAuthUser:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  request: NextRequest,
  requiredRole?: 'admin' | 'editor' | 'author'
): Promise<{
  user: User;
  payload: JWTPayload;
} | NextResponse> {
  let token = getTokenFromRequest(request);

  // Fallback: If no token in headers, try to extract from URL search params or body
  if (!token) {
    try {
      // If still no token, try body
      if (!token) {
        const clonedReq = request.clone();
        const contentType = clonedReq.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const body = await clonedReq.json();
          if (body && typeof body._token === 'string' && body._token.trim()) {
            token = body._token.trim();
          }
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await clonedReq.formData();
          const formToken = formData.get('_token');
          if (typeof formToken === 'string' && formToken.trim()) {
            token = formToken.trim();
          }
        }
      }
    } catch (err) {
      console.warn('[Auth] Failed to parse body/url for fallback token:', err);
    }
  }

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  const auth = await getAuthUserFromToken(token);

  if (!auth) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 }
    );
  }

  if (requiredRole && !authService.hasRole(auth.user, requiredRole)) {
    console.error(`[Auth] Role check failed - User role: "${auth.user.role}", Required: "${requiredRole}"`, {
      userId: auth.user.id,
      userEmail: auth.user.email,
    });
    return NextResponse.json(
      {
        success: false,
        error: `Forbidden - Insufficient permissions. Required role: ${requiredRole}, Your role: ${auth.user.role}`,
      },
      { status: 403 }
    );
  }

  return auth;
}

/**
 * Require admin middleware
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{
  user: User;
  payload: JWTPayload;
} | NextResponse> {
  return requireAuth(request, 'admin');
}

