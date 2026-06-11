import { NextResponse } from 'next/server';
import { ReportsRepository } from '@/modules/reports/repository/reports.repository';

const repo = new ReportsRepository();

export async function GET() {
  try {
    const reports = await repo.findActive();
    return NextResponse.json({ success: true, data: reports });
  } catch (err) {
    console.error('GET /api/reports error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports', details: (err as Error).message }, { status: 500 });
  }
}