import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import {
  EnsTravelEnquiriesService,
  EnsTravelEnquiryNotFoundError,
} from '@/modules/ens-travel-enquiries/service/ens-travel-enquiries.service';
import { EnsTravelEnquiriesRepository } from '@/modules/ens-travel-enquiries/repository/ens-travel-enquiries.repository';
import { EnsTravelValidationError } from '@/modules/ens-travel-enquiries/domain/types';

const service = new EnsTravelEnquiriesService(new EnsTravelEnquiriesRepository());

/** One enquiry, for the detail view (so it can re-read the latest after a save elsewhere). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const enquiry = await service.getById(id);
    if (!enquiry) return NextResponse.json({ success: false, error: 'Enquiry not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: enquiry });
  } catch (error) {
    console.error('Error fetching Expand North Star enquiry:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch enquiry' }, { status: 500 });
  }
}

/** An admin edit from the Sales Tracker's detail view: the visitor's fields (same validation as the
 * public form, so an edit can never leave an enquiry the form would have refused) plus the lead
 * status and conversation note. Stamps `updated_at` and records the admin's name as `updated_by`.
 * These enquiries have no row in `sales_leads`, so there is nothing else to keep in step. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  const [body, bodyError] = await parseJsonBody<Record<string, unknown>>(request);
  if (bodyError) return bodyError;
  if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

  const { id } = await params;
  const editor = auth.user.name || auth.user.email || '';

  try {
    const saved = await service.update(id, body, editor);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    if (error instanceof EnsTravelValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof EnsTravelEnquiryNotFoundError) {
      return NextResponse.json({ success: false, error: 'Enquiry not found' }, { status: 404 });
    }
    console.error('Error updating Expand North Star enquiry:', error);
    return NextResponse.json({ success: false, error: "Couldn't save the changes. Please try again." }, { status: 500 });
  }
}
