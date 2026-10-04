import { NextRequest, NextResponse } from 'next/server';
import { requirePublicUser } from '@/lib/public-auth-server';
import { filtersFromSearchParams, getFundingOverview } from '@/modules/funding-deals/service/funding-deals.service';
import type { TrendRange } from '@/modules/funding-deals/domain/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/funding/overview — reader dashboard Funding page (logged-in readers).
 * Filter-bar params: search, sector, stage, city, country, investor, from, to.
 * Pinned-card params: pinnedCountry (all | India | USA | …), range (week | month | year).
 */
export async function GET(req: NextRequest) {
  const auth = requirePublicUser(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const rangeParam = searchParams.get('range');
  const range: TrendRange = rangeParam === 'week' || rangeParam === 'year' ? rangeParam : 'month';
  const pinnedCountry = (searchParams.get('pinnedCountry') || 'all').slice(0, 100);

  try {
    const data = await getFundingOverview(filtersFromSearchParams(searchParams), pinnedCountry, range);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[funding/overview]', err);
    return NextResponse.json({ success: false, error: 'Failed to load funding data.' }, { status: 500 });
  }
}
