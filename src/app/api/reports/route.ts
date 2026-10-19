import { NextResponse } from 'next/server';
import { ReportsRepository } from '@/modules/reports/repository/reports.repository';
import { REPORTS_LOCK_ENABLED, REPORTS_PAGE_SIZE, applyReportsLock } from '@/modules/reports/domain/lock';
import { getReportsFreePages } from '@/lib/site-settings';

// The lock setting can change at any time; never serve a cached list.
export const dynamic = 'force-dynamic';

const repo = new ReportsRepository();

export async function GET() {
  try {
    // Due reports are published by the report-scheduler cron job (every 5 min) —
    // no need to run the publishDue() write on every read request.
    const [reports, freePages] = await Promise.all([
      repo.findActive(),
      REPORTS_LOCK_ENABLED ? getReportsFreePages() : Promise.resolve(null),
    ]);
    // Reports past the open pages of their section come back with `locked: true` and no file link.
    return NextResponse.json({
      success: true,
      data: applyReportsLock(reports, freePages),
      lock: { freePages, pageSize: REPORTS_PAGE_SIZE },
    });
  } catch (err) {
    console.error('GET /api/reports error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports', details: (err as Error).message }, { status: 500 });
  }
}
