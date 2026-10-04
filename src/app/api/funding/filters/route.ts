import { NextRequest, NextResponse } from 'next/server';
import { requirePublicUser } from '@/lib/public-auth-server';
import { getFilterOptions } from '@/modules/funding-deals/service/funding-deals.service';

export const dynamic = 'force-dynamic';

/** GET /api/funding/filters — dropdown options (sectors, stages, cities, countries), most common first. */
export async function GET(req: NextRequest) {
  const auth = requirePublicUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ success: true, data: await getFilterOptions() });
  } catch (err) {
    console.error('[funding/filters]', err);
    return NextResponse.json({ success: false, error: 'Failed to load filters.' }, { status: 500 });
  }
}
