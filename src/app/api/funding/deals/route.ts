import { NextRequest, NextResponse } from 'next/server';
import { requirePublicUser } from '@/lib/public-auth-server';
import { filtersFromSearchParams, listDeals } from '@/modules/funding-deals/service/funding-deals.service';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

/** GET /api/funding/deals — paged deals table (newest first) for the reader Funding page. */
export async function GET(req: NextRequest) {
  const auth = requirePublicUser(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  try {
    const { deals, total } = await listDeals(filtersFromSearchParams(searchParams), page, PAGE_SIZE);
    // Readers get the deal fields only — no admin bookkeeping (batch, created by/at).
    const data = deals.map((d) => ({
      id: d.id,
      date: d.date,
      startupName: d.startupName,
      sector: d.sector,
      businessModel: d.businessModel,
      roundStage: d.roundStage,
      amount: d.amount,
      amountRaw: d.amountRaw,
      city: d.city,
      country: d.country,
      leadInvestor: d.leadInvestor,
      investors: d.investors,
      sourceUrl: d.sourceUrl,
    }));
    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) },
    });
  } catch (err) {
    console.error('[funding/deals]', err);
    return NextResponse.json({ success: false, error: 'Failed to load deals.' }, { status: 500 });
  }
}
