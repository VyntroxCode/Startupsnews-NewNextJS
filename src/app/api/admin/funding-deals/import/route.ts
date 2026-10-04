import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { FUNDING_ROLES } from '@/shared/middleware/roles';
import { importDeals, MAX_IMPORT_ROWS } from '@/modules/funding-deals/service/funding-deals.service';

export const maxDuration = 60;

/**
 * POST /api/admin/funding-deals/import — bulk insert rows parsed from an Excel/CSV file in the
 * browser (Admin › Funding Data › Bulk Upload).
 * Body: { fileName, rows: [{ date, startupName, ... }], rowNumbers?: number[] }
 * Creates one upload batch (undo-able from Upload History); duplicates are skipped, not overwritten.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: { fileName?: unknown; rows?: unknown; rowNumbers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows.filter((r) => r && typeof r === 'object') : [];
  if (!rows.length) return NextResponse.json({ success: false, error: 'No rows to import.' }, { status: 400 });
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { success: false, error: `Too many rows (${rows.length}). Upload at most ${MAX_IMPORT_ROWS} per file.` },
      { status: 400 },
    );
  }
  const rowNumbers = Array.isArray(body.rowNumbers) ? body.rowNumbers.map((n) => Number(n) || 0) : [];

  try {
    const result = await importDeals(
      typeof body.fileName === 'string' ? body.fileName : 'upload.xlsx',
      rows as Record<string, unknown>[],
      rowNumbers,
      { email: auth.user.email ?? null, role: auth.user.role ?? null },
    );
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[admin/funding-deals/import]', err);
    return NextResponse.json({ success: false, error: 'Import failed. Check Upload History — undo any partial upload, then try again.' }, { status: 500 });
  }
}
