import { NextRequest, NextResponse } from 'next/server';
import * as repo from '@/modules/public-users/repository/public-users.repository';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, country, password } = await req.json() as {
      name?: string; email?: string; phone?: string; country?: string; password?: string;
    };

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Name must be at least 2 characters.' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: 'A valid email is required.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const exists = await repo.emailExists(email.toLowerCase().trim());
    if (exists) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }

    await repo.create({ name: name.trim(), email: email.toLowerCase().trim(), phone, country, password });

    return NextResponse.json({ success: true, message: 'Account created successfully.' });
  } catch (err) {
    console.error('[public-auth/register]', err);
    return NextResponse.json({ success: false, error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
