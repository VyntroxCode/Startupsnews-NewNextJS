import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { FUNDING_ROLES } from '@/shared/middleware/roles';
import { filtersFromSearchParams, listDealsForExport } from '@/modules/funding-deals/service/funding-deals.service';
import { dealsXlsxResponse } from '@/modules/funding-deals/utils/export';

export const maxDuration = 60;

/** GET /api/admin/funding-deals/export — filtered deals as .xlsx (Manage Records › Export). */
export async function GET(req: NextRequest) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const deals = await listDealsForExport(filtersFromSearchParams(new URL(req.url).searchParams));
    return dealsXlsxResponse(deals, 'funding-deals-admin');
  } catch (err) {
    console.error('[admin/funding-deals/export]', err);
    return NextResponse.json({ success: false, error: 'Export failed.' }, { status: 500 });
  }
}
