import { NextRequest, NextResponse } from 'next/server';
import { requirePublicUser } from '@/lib/public-auth-server';
import { FundingSponsorCardsRepository } from '@/modules/funding-sponsor-cards/repository/funding-sponsor-cards.repository';

export const dynamic = 'force-dynamic';

const repo = new FundingSponsorCardsRepository();

/** GET /api/funding/sponsor-cards — the (up to 3) sponsor cards switched on in Admin › User
 * Management, for the top of the reader Funding Dashboard (logged-in readers). */
export async function GET(req: NextRequest) {
  const auth = requirePublicUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    return NextResponse.json({ success: true, data: await repo.listActive() });
  } catch (err) {
    console.error('[funding/sponsor-cards]', err);
    return NextResponse.json({ success: false, error: 'Failed to load sponsor cards.' }, { status: 500 });
  }
}
