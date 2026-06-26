import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { unsubscribeByEmail, findByEmail } from '@/modules/public-users/repository/public-users.repository';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

/** POST /api/unsubscribe — unsubscribe by email (form submission) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string };
    const email = (body.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }
    const { found } = await unsubscribeByEmail(email);
    // Always return success to avoid email enumeration
    return NextResponse.json({ success: true, found });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to unsubscribe' }, { status: 500 });
  }
}

/** GET /api/unsubscribe?token=xxx — one-click unsubscribe via signed JWT link */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { email?: string; purpose?: string };
    if (payload.purpose !== 'unsubscribe' || !payload.email) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }
    const { found } = await unsubscribeByEmail(payload.email);
    return NextResponse.json({ success: true, found, email: payload.email });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
  }
}
