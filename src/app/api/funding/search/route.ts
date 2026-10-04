import { NextRequest, NextResponse } from 'next/server';
import { requirePublicUser } from '@/lib/public-auth-server';
import { filtersFromSearchParams, listDeals } from '@/modules/funding-deals/service/funding-deals.service';

export const dynamic = 'force-dynamic';

const SHOWN = 50;

/**
 * GET /api/funding/search?search=&sector=&city=&country=&stage=&investor= — reader Search page.
 * Matches startup, sector or investor (the shared `search` filter); returns the first 50 rows and
 * the full match count.
 */
export async function GET(req: NextRequest) {
  const auth = requirePublicUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { deals, total } = await listDeals(filtersFromSearchParams(new URL(req.url).searchParams), 1, SHOWN);
    const data = deals.map((d) => ({
      id: d.id,
      date: d.date,
      startupName: d.startupName,
      sector: d.sector,
      roundStage: d.roundStage,
      amount: d.amount,
      city: d.city,
      country: d.country,
      leadInvestor: d.leadInvestor,
      sourceUrl: d.sourceUrl,
    }));
    return NextResponse.json({ success: true, data, total, shown: data.length });
  } catch (err) {
    console.error('[funding/search]', err);
    return NextResponse.json({ success: false, error: 'Search failed.' }, { status: 500 });
  }
}
