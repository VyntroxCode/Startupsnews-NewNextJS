import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { SalesTrackerService } from '@/modules/sales-tracker/service/sales-tracker.service';
import { SalesTrackerRepository } from '@/modules/sales-tracker/repository/sales-tracker.repository';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { SalesLead } from '@/modules/sales-tracker/domain/types';
import { getPromotedCityOptions } from '@/lib/data-adapter';

const repository = new SalesTrackerRepository();
const service = new SalesTrackerService(repository);

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    // `promotedCities` rides along so the Add/Edit lead form's City dropdown offers exactly what
    // the public forms offer (curated + earned cities) without a second round trip.
    const [leads, promotedCities] = await Promise.all([service.getAllLeads(), getPromotedCityOptions()]);
    return NextResponse.json({ success: true, data: leads, promotedCities });
  } catch (error) {
    console.error('Error fetching sales leads:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<SalesLead>(request);
    if (errorResponse) return errorResponse;
    if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

    const lead = await service.saveLead(body);
    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    console.error('Error saving sales lead:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save lead' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    await service.deleteAllLeads();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting all sales leads:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete leads' },
      { status: 500 }
    );
  }
}
