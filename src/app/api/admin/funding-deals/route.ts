import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { FUNDING_ROLES } from '@/shared/middleware/roles';
import {
  createDeal,
  filtersFromSearchParams,
  getDeal,
  getFilterOptions,
  isDuplicateKeyError,
  listDeals,
  prepareDeal,
} from '@/modules/funding-deals/service/funding-deals.service';

/** GET /api/admin/funding-deals — paged deal list for Admin › Funding Data › Manage Records.
 * Same filter params as the reader API (search, sector, stage, city, country, investor, from, to). */
export async function GET(req: NextRequest) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

  try {
    const filters = filtersFromSearchParams(searchParams);
    const [{ deals, total }, options] = await Promise.all([
      listDeals(filters, page, limit),
      getFilterOptions(),
    ]);
    return NextResponse.json({
      success: true,
      data: deals,
      options,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    console.error('[admin/funding-deals GET]', err);
    return NextResponse.json({ success: false, error: 'Failed to load funding deals.' }, { status: 500 });
  }
}

/** POST /api/admin/funding-deals — add one deal (manual entry). */
export async function POST(req: NextRequest) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const prepared = prepareDeal(body);
  if ('error' in prepared) return NextResponse.json({ success: false, error: prepared.error }, { status: 400 });

  try {
    const id = await createDeal(prepared.row, auth.user.email ?? null);
    const deal = await getDeal(id);
    return NextResponse.json({ success: true, data: deal }, { status: 201 });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return NextResponse.json(
        { success: false, error: 'This deal already exists (same date, startup and round stage).' },
        { status: 409 },
      );
    }
    console.error('[admin/funding-deals POST]', err);
    return NextResponse.json({ success: false, error: 'Failed to save the deal.' }, { status: 500 });
  }
}
