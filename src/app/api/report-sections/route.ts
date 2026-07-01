import { NextResponse } from 'next/server';
import { ReportSectionsRepository } from '@/modules/reports/repository/report-sections.repository';

const repo = new ReportSectionsRepository();

export async function GET() {
  try {
    const sections = await repo.findAll();
    return NextResponse.json({ success: true, data: sections });
  } catch (err) {
    console.error('GET /api/report-sections error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch sections' }, { status: 500 });
  }
}
