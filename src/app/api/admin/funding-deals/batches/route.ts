import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { FUNDING_ROLES } from '@/shared/middleware/roles';
import { listUploadBatches } from '@/modules/funding-deals/service/funding-deals.service';

/** GET /api/admin/funding-deals/batches — upload history (newest first). */
export async function GET(req: NextRequest) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ success: true, data: await listUploadBatches() });
  } catch (err) {
    console.error('[admin/funding-deals/batches]', err);
    return NextResponse.json({ success: false, error: 'Failed to load upload history.' }, { status: 500 });
  }
}
