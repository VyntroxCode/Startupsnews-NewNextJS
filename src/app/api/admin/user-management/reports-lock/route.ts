import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { USER_MANAGEMENT_ROLES } from '@/shared/middleware/roles';
import { REPORTS_LOCK_ENABLED, REPORTS_PAGE_SIZE, validateFreePages } from '@/modules/reports/domain/lock';
import { getReportsFreePages, setReportsFreePages } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

const DISABLED = () => NextResponse.json({ success: false, error: 'The Reports lock is disabled.' }, { status: 403 });

/** GET /api/admin/user-management/reports-lock — { freePages, pageSize }; freePages null = no lock. */
export async function GET(req: NextRequest) {
  const auth = await requireAnyRole(req, USER_MANAGEMENT_ROLES);
  if (auth instanceof NextResponse) return auth;
  if (!REPORTS_LOCK_ENABLED) return DISABLED();

  return NextResponse.json({ success: true, data: { freePages: await getReportsFreePages(), pageSize: REPORTS_PAGE_SIZE } });
}

/** PUT /api/admin/user-management/reports-lock — body { freePages: number | null }. Applies to every
 * report section on the reader Reports page from the next time it is opened. */
export async function PUT(req: NextRequest) {
  const auth = await requireAnyRole(req, USER_MANAGEMENT_ROLES);
  if (auth instanceof NextResponse) return auth;
  if (!REPORTS_LOCK_ENABLED) return DISABLED();

  const parsed = validateFreePages(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

  try {
    await setReportsFreePages(parsed.freePages);
    return NextResponse.json({ success: true, data: { freePages: parsed.freePages, pageSize: REPORTS_PAGE_SIZE } });
  } catch (err) {
    console.error('[admin/user-management/reports-lock]', err);
    return NextResponse.json({ success: false, error: 'Failed to save the setting.' }, { status: 500 });
  }
}
