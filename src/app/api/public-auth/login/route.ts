import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import * as repo from '@/modules/public-users/repository/public-users.repository';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json() as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await repo.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    const valid = await repo.verifyPassword(user, password);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    await repo.updateLastLogin(user.id);

    const token = jwt.sign(
      { pubUserId: user.id, email: user.email, type: 'public' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, country: user.country },
      },
    });
  } catch (err) {
    console.error('[public-auth/login]', err);
    return NextResponse.json({ success: false, error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
