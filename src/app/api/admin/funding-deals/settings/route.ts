import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { FUNDING_ROLES } from '@/shared/middleware/roles';
import { getFundingNumberSystem, saveFundingNumberSystem } from '@/modules/funding-deals/service/funding-deals.service';
import { isNumberSystem } from '@/modules/funding-deals/utils/format';

/** GET /api/admin/funding-deals/settings — the saved number system (Indian Lakh/Crore or International Mn/Bn). */
export async function GET(req: NextRequest) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ success: true, data: { numberSystem: await getFundingNumberSystem() } });
}

/** PUT /api/admin/funding-deals/settings — { numberSystem: 'indian' | 'international' }. Applies to admin and reader Funding pages. */
export async function PUT(req: NextRequest) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const numberSystem = body?.numberSystem;
  if (!isNumberSystem(numberSystem)) {
    return NextResponse.json({ success: false, error: 'numberSystem must be "indian" or "international".' }, { status: 400 });
  }

  try {
    await saveFundingNumberSystem(numberSystem);
    return NextResponse.json({ success: true, data: { numberSystem } });
  } catch (err) {
    console.error('[admin/funding-deals/settings PUT]', err);
    return NextResponse.json({ success: false, error: 'Failed to save the setting.' }, { status: 500 });
  }
}
