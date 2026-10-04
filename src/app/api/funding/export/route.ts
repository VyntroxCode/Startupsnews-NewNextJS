import { NextRequest, NextResponse } from 'next/server';
import { requirePublicUser } from '@/lib/public-auth-server';
import { filtersFromSearchParams, listDealsForExport } from '@/modules/funding-deals/service/funding-deals.service';
import { dealsXlsxResponse } from '@/modules/funding-deals/utils/export';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/funding/export — the filtered deals as an .xlsx download (reader Funding page). */
export async function GET(req: NextRequest) {
  const auth = requirePublicUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const deals = await listDealsForExport(filtersFromSearchParams(new URL(req.url).searchParams));
    return dealsXlsxResponse(deals, 'startupnews-funding-deals');
  } catch (err) {
    console.error('[funding/export]', err);
    return NextResponse.json({ success: false, error: 'Export failed.' }, { status: 500 });
  }
}
