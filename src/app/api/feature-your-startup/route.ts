import { NextRequest, NextResponse } from 'next/server';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { getClientIp } from '@/lib/request-fingerprint';
// Module-scoped in-memory limiter; the key prefix keeps this route's counts separate from IncubatX's.
import { checkRateLimit } from '@/lib/rate-limit/incubatx-rate-limiter';
import { FeatureStartupSubmissionsService } from '@/modules/feature-startup-submissions/service/feature-startup-submissions.service';
import { FeatureStartupSubmissionsRepository } from '@/modules/feature-startup-submissions/repository/feature-startup-submissions.repository';
import { FeatureStartupValidationError } from '@/modules/feature-startup-submissions/domain/types';
import { submissionToSalesLead } from '@/modules/feature-startup-submissions/service/to-sales-lead';
import { SalesTrackerService } from '@/modules/sales-tracker/service/sales-tracker.service';
import { SalesTrackerRepository } from '@/modules/sales-tracker/repository/sales-tracker.repository';

export const runtime = 'nodejs';

const RATE_LIMIT = { windowMs: 10 * 60 * 1000, max: 5 };

const service = new FeatureStartupSubmissionsService(new FeatureStartupSubmissionsRepository());
const salesTrackerService = new SalesTrackerService(new SalesTrackerRepository());

/** Public endpoint behind the /feature-your-startup form. Each submission lands in
 * `feature_startup_submissions` (the raw record of what was submitted) and is also mirrored into
 * `sales_leads` (see to-sales-lead.ts) so it shows up in the admin Sales Tracker's general
 * "All leads" table, under its "Filter: page leads" filter, the same as every other lead source. */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (ip && !checkRateLimit(`feature-your-startup:${ip}`, RATE_LIMIT)) {
    return NextResponse.json(
      { success: false, error: 'Too many submissions from this network. Please try again in a few minutes.' },
      { status: 429 }
    );
  }

  const [body, bodyError] = await parseJsonBody<Record<string, unknown>>(request);
  if (bodyError) return bodyError;
  if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

  try {
    const saved = await service.create(body);

    // Best-effort: the founder's submission is already safely saved above, so a failure mirroring
    // it into the general leads table should not fail their request.
    try {
      await salesTrackerService.saveLead(submissionToSalesLead(saved));
    } catch (mirrorError) {
      console.error('Error mirroring Feature Your Startup submission into sales_leads:', mirrorError);
    }

    return NextResponse.json({ success: true, data: { id: saved.id } }, { status: 201 });
  } catch (error) {
    if (error instanceof FeatureStartupValidationError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error('Error saving Feature Your Startup submission:', error);
    return NextResponse.json(
      { success: false, error: "We couldn't submit your details right now. Please try again." },
      { status: 500 }
    );
  }
}
