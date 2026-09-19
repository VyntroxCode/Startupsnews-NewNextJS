import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { EnsTravelEnquiriesService } from '@/modules/ens-travel-enquiries/service/ens-travel-enquiries.service';
import { EnsTravelEnquiriesRepository } from '@/modules/ens-travel-enquiries/repository/ens-travel-enquiries.repository';

const service = new EnsTravelEnquiriesService(new EnsTravelEnquiriesRepository());

/** Every /expand-north-star enquiry, newest first, for the Sales Tracker's "Expand North Star
 * enquiries" card. Edits go through PATCH /api/admin/sales-tracker/ens-enquiries/[id]. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const enquiries = await service.getAll();
    return NextResponse.json({ success: true, data: enquiries });
  } catch (error) {
    console.error('Error fetching Expand North Star enquiries:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch Expand North Star enquiries' },
      { status: 500 }
    );
  }
}
