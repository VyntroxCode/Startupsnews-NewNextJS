import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { SalesTrackerService } from '@/modules/sales-tracker/service/sales-tracker.service';
import { SalesTrackerRepository } from '@/modules/sales-tracker/repository/sales-tracker.repository';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { type LeadImportRaw, MAX_LEAD_IMPORT_ROWS } from '@/modules/sales-tracker/utils/import-columns';

export const maxDuration = 60;

const service = new SalesTrackerService(new SalesTrackerRepository());

/**
 * POST /api/admin/sales-tracker/leads/import — bulk-adds leads from an Excel file parsed in the
 * browser (Sales Tracker › Import leads, BulkImportModal).
 * Body: { fileName, rows: [{ date, name, company, contact, ... }], rowNumbers, defaultType, defaultFollowUpDate }
 * Every row is checked again on the server; the answer lists the stored leads and the rows refused.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  const [body, errorResponse] = await parseJsonBody<{
    fileName?: unknown; rows?: unknown; rowNumbers?: unknown; defaultType?: unknown; defaultFollowUpDate?: unknown;
  }>(request);
  if (errorResponse) return errorResponse;

  const rows = Array.isArray(body?.rows) ? body.rows.filter((r): r is LeadImportRaw => !!r && typeof r === 'object') : [];
  if (!rows.length) return NextResponse.json({ success: false, error: 'No rows to import.' }, { status: 400 });
  if (rows.length > MAX_LEAD_IMPORT_ROWS) {
    return NextResponse.json(
      { success: false, error: `Too many rows (${rows.length}). Import at most ${MAX_LEAD_IMPORT_ROWS} leads per file.` },
      { status: 400 }
    );
  }
  const rowNumbers = Array.isArray(body?.rowNumbers) ? body.rowNumbers.map((n) => Number(n) || 0) : [];
  const fileName = typeof body?.fileName === 'string' && body.fileName.trim() ? body.fileName.trim().slice(0, 200) : 'Excel file';

  try {
    const result = await service.importLeads(
      rows,
      rowNumbers,
      {
        type: typeof body?.defaultType === 'string' ? body.defaultType : '',
        nextFollowUpDate: typeof body?.defaultFollowUpDate === 'string' ? body.defaultFollowUpDate : '',
      },
      fileName,
      auth.user.name || auth.user.email || ''
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error importing sales leads:', error);
    return NextResponse.json({ success: false, error: 'Import failed. Check All leads for what was added, then try again.' }, { status: 500 });
  }
}
