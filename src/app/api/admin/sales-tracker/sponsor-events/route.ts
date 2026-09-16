import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { SALES_TRACKER_ROLES } from '@/shared/middleware/roles';
import { SponsorEventSubmissionsService } from '@/modules/sponsor-event-submissions/service/sponsor-event-submissions.service';
import { SponsorEventSubmissionsRepository } from '@/modules/sponsor-event-submissions/repository/sponsor-event-submissions.repository';

const service = new SponsorEventSubmissionsService(new SponsorEventSubmissionsRepository());

/** Every /sponsor-event submission, newest first, for the Sales Tracker's "Sponsor Event
 * submissions" card. Read-only: the working copy the team edits is the mirrored sales_leads row. */
export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, SALES_TRACKER_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const submissions = await service.getAll();
    return NextResponse.json({ success: true, data: submissions });
  } catch (error) {
    console.error('Error fetching sponsor event submissions:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch sponsor event submissions' },
      { status: 500 }
    );
  }
}
