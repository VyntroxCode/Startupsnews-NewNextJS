import { NextRequest, NextResponse } from 'next/server';
import { requirePublicUser } from '@/lib/public-auth-server';
import { getMarketView, MARKET_VIEWS } from '@/modules/funding-deals/service/funding-deals.service';
import type { MarketView } from '@/modules/funding-deals/domain/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/funding/market?view=overview|timeseries|location|growth|cumulative|h2h — one Market
 * Analysis tab (reader /dashboard/funding/market). Tab params: location, granularity (timeseries),
 * metric (location), from/to (growth), location (cumulative), a/b (h2h).
 */
export async function GET(req: NextRequest) {
  const auth = requirePublicUser(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get('view') as MarketView;
  if (!MARKET_VIEWS.includes(view)) {
    return NextResponse.json({ success: false, error: 'Unknown view.' }, { status: 400 });
  }

  try {
    const { meta, data } = await getMarketView(view, searchParams);
    return NextResponse.json({ success: true, meta, data });
  } catch (err) {
    console.error('[funding/market]', err);
    return NextResponse.json({ success: false, error: 'Failed to load market analysis.' }, { status: 500 });
  }
}
