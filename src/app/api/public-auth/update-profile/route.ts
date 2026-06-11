import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import * as repo from '@/modules/public-users/repository/public-users.repository';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

    const payload = jwt.verify(token, JWT_SECRET) as { pubUserId: number };
    const { phone, country, city, linkedin_url } = await req.json() as { phone?: string; country?: string; city?: string; linkedin_url?: string };

    await repo.updateProfile(payload.pubUserId, { phone, country, city, linkedin_url });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update profile.' }, { status: 500 });
  }
}
