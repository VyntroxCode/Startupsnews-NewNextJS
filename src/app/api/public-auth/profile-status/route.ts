import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import * as repo from '@/modules/public-users/repository/public-users.repository';
import type { PublicUserEntity } from '@/modules/public-users/domain/types';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-secret';

// Profile completion is a fixed set of weighted fields that adds up to 100, the same for every
// category (weights set by the product owner, 2026-09-30). Country + City are one 10% item and
// only count when BOTH are filled. Category-specific step-4 fields don't affect the score.
// `missing` lists the unmet keys heaviest first, so the dashboard names the most valuable gaps.
const COMPLETION_WEIGHTS: { keys: (keyof PublicUserEntity)[]; weight: number }[] = [
  { keys: ['phone'], weight: 15 },
  { keys: ['linkedin_url'], weight: 15 },
  { keys: ['bio'], weight: 15 },
  { keys: ['name'], weight: 10 },
  { keys: ['country', 'city'], weight: 10 },
  { keys: ['website'], weight: 10 },
  { keys: ['category'], weight: 10 },
  { keys: ['g_organization'], weight: 5 },
  { keys: ['g_role'], weight: 5 },
  { keys: ['email'], weight: 5 },
];

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });

  let pubUserId: number;
  try {
    pubUserId = (jwt.verify(token, JWT_SECRET) as { pubUserId: number }).pubUserId;
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  // Without this, any DB error came back as an HTML 500 page; the dashboard's r.json() then threw
  // and it silently showed "0% complete" with no city or Member Since.
  try {
    const { user, founders, fundingRounds } = await repo.getProfileDetail(pubUserId);
    if (!user) return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });

    const missing: string[] = [];
    let percent = 0;
    for (const { keys, weight } of COMPLETION_WEIGHTS) {
      const empty = keys.filter((k) => !String(user[k] ?? '').trim());
      if (empty.length === 0) percent += weight;
      else missing.push(...(empty as string[]));
    }

    return NextResponse.json({
      success: true,
      data: {
        complete: missing.length === 0,
        missing,
        percent,
        user,
        founders,
        fundingRounds,
      },
    });
  } catch (err) {
    console.error('GET /api/public-auth/profile-status error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to load profile status' },
      { status: 500 }
    );
  }
}
