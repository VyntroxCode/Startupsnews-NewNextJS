import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { requireJwtSecret } from '@/shared/config/jwt-secret';

const JWT_SECRET = requireJwtSecret();

/**
 * Server-side check for a logged-in reader (public site user). The dashboard sends the JWT from
 * localStorage['pub_auth_token'] as `Authorization: Bearer <token>` — the same check every
 * /api/public-auth route does inline, pulled out here for the reader Funding APIs.
 * Returns { pubUserId } or a 401 response to return as-is.
 */
export function requirePublicUser(req: NextRequest): { pubUserId: number } | NextResponse {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  try {
    const { pubUserId } = jwt.verify(token, JWT_SECRET) as { pubUserId: number };
    if (!pubUserId) throw new Error('No pubUserId');
    return { pubUserId };
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
}
