import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import * as repo from '@/modules/public-users/repository/public-users.repository';
import type { RegistrationProfileFields, Founder, FundingRound } from '@/modules/public-users/domain/types';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

function getPubUserId(req: NextRequest): number | null {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { pubUserId: number };
    return payload.pubUserId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const pubUserId = getPubUserId(req);
  if (!pubUserId) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

  const { user, founders, fundingRounds } = await repo.getProfileDetail(pubUserId);
  if (!user) return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });

  return NextResponse.json({ success: true, data: { user, founders, fundingRounds } });
}

export async function POST(req: NextRequest) {
  try {
    const pubUserId = getPubUserId(req);
    if (!pubUserId) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

    const body = await req.json() as {
      phone?: string; country?: string; city?: string; linkedin_url?: string; website?: string; bio?: string;
      category?: string; otherCategory?: string;
      profile?: Partial<RegistrationProfileFields>;
      founders?: Founder[];
      fundingRounds?: FundingRound[];
    };

    const { phone, country, city, linkedin_url, website, bio, category, otherCategory, profile, founders, fundingRounds } = body;

    await repo.updateProfile(pubUserId, {
      phone, country, city, linkedin_url, website, bio,
      category,
      other_category: otherCategory,
      ...(profile || {}),
    });

    if (category === 'startup') {
      if (founders) await repo.replaceFounders(pubUserId, founders);
      if (fundingRounds) await repo.replaceFundingRounds(pubUserId, fundingRounds);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update profile.' }, { status: 500 });
  }
}
