import { UsersService } from './users.service';
import { User } from '../domain/types';
import { PanelAdminsService } from '@/modules/panel-admins/service/panel-admins.service';
import { PanelAdmin } from '@/modules/panel-admins/domain/types';
import jwt, { SignOptions } from 'jsonwebtoken';

/** Minimal shape needed to sign a token — satisfied by both User and PanelAdmin. */
interface AuthPrincipal {
  id: number;
  email: string;
  role: string;
}

// Ensure JWT_SECRET is always a string (required for jwt.sign)
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_EXPIRED_GRACE_SECONDS = parseInt(process.env.JWT_EXPIRED_GRACE_SECONDS || String(30 * 24 * 60 * 60), 10);

// Validate JWT_SECRET is not empty
if (!JWT_SECRET || JWT_SECRET.trim() === '') {
  throw new Error('JWT_SECRET environment variable is required and cannot be empty');
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export class AuthService {
  constructor(
    private usersService: UsersService,
    private panelAdminsService: PanelAdminsService
  ) {}

  /**
   * Generate JWT token
   */
  generateToken(principal: AuthPrincipal): string {
    const payload: JWTPayload = {
      userId: principal.id,
      email: principal.email,
      role: principal.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(principal: AuthPrincipal): string {
    const payload: JWTPayload = {
      userId: principal.id,
      email: principal.email,
      role: principal.role,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as JWTPayload & { exp?: number };
          const exp = typeof decoded.exp === 'number' ? decoded.exp : null;
          const now = Math.floor(Date.now() / 1000);
          if (exp && now - exp <= JWT_EXPIRED_GRACE_SECONDS) {
            return decoded;
          }
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Login and return user with token.
   * Tries the real-login `users` table (admin/editor/author) first, then the
   * separate `panel_admins` table (event_admin/publisher_admin).
   */
  async login(email: string, password: string): Promise<{
    user: User | PanelAdmin;
    token: string;
    refreshToken: string;
  }> {
    try {
      const { user } = await this.usersService.login({ email, password });
      return {
        user,
        token: this.generateToken(user),
        refreshToken: this.generateRefreshToken(user),
      };
    } catch (usersError) {
      try {
        const { admin } = await this.panelAdminsService.login({ email, password });
        return {
          user: admin,
          token: this.generateToken(admin),
          refreshToken: this.generateRefreshToken(admin),
        };
      } catch {
        throw usersError;
      }
    }
  }

  /**
   * Verify if user has required role
   */
  hasRole(user: AuthPrincipal, requiredRole: 'admin' | 'editor' | 'author'): boolean {
    const roleHierarchy: Record<string, number> = {
      admin: 3,
      administrator: 3, // alias for admin
      editor: 2,
      author: 1,
    };

    // Normalize role to lowercase for comparison (defensive)
    let userRole = (user.role || '').toLowerCase().trim();
    if (userRole === 'administrator') userRole = 'admin';
    const requiredRoleLower = (requiredRole || '').toLowerCase().trim();

    // Check if roles are valid
    if (!userRole || !roleHierarchy[userRole]) {
      console.warn(`[Auth] Invalid user role: "${user.role}" (normalized: "${userRole}")`);
      return false;
    }

    if (!requiredRoleLower || !roleHierarchy[requiredRoleLower]) {
      console.warn(`[Auth] Invalid required role: "${requiredRole}" (normalized: "${requiredRoleLower}")`);
      return false;
    }

    const userRoleLevel = roleHierarchy[userRole];
    const requiredRoleLevel = roleHierarchy[requiredRoleLower];

    return userRoleLevel >= requiredRoleLevel;
  }

  /**
   * Check if user is admin
   */
  isAdmin(user: User): boolean {
    return user.role === 'admin';
  }
}

