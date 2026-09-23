import { NextRequest, NextResponse } from 'next/server';
import { ReportsRepository } from '@/modules/reports/repository/reports.repository';
import { ReportSectionsRepository } from '@/modules/reports/repository/report-sections.repository';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { EventsService } from '@/modules/events/service/events.service';

/**
 * GET /api/dashboard/weekly-highlights?city=<city>
 *
 * Powers the member dashboard's "N new funding reports and N founder events dropped in <city>
 * this week" summary line. Two counts, neither backed by an existing endpoint:
 *   - fundingReportsThisWeek: active reports filed under the "Funding" report section, published
 *     or created in the last 7 days.
 *   - cityEventsThisWeek: upcoming events whose location mentions the given city, newly added
 *     (created_at) in the last 7 days. Falls back to 0 when no city is supplied — there's no
 *     honest "this week" event count without one to filter by.
 * No auth required: this returns only aggregate, non-personal counts. `city` is public info the
 * caller already has from their own profile (fetched via the authenticated profile-status call).
 */

const reportsRepository = new ReportsRepository();
const reportSectionsRepository = new ReportSectionsRepository();
const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function withinLastWeek(value: unknown): boolean {
  if (!value) return false;
  const t = new Date(String(value).replace(' ', 'T')).getTime();
  if (Number.isNaN(t)) return false;
  const age = Date.now() - t;
  // `age < 0` means the timestamp is in the future — e.g. a report's `publish_at` can be
  // scheduled ahead of time (`findActive()` doesn't filter on it), so without this a report
  // scheduled for next week would already count as "dropped this week" the moment it's created,
  // before it's actually live. Only count things that are both recent *and* already in the past.
  return age >= 0 && age <= WEEK_MS;
}

export async function GET(req: NextRequest) {
  try {
    const city = req.nextUrl.searchParams.get('city')?.trim() || '';

    const [reports, sections, events] = await Promise.all([
      reportsRepository.findActive(),
      reportSectionsRepository.findAll(),
      eventsService.getUpcomingForPublic(),
    ]);

    // Matches by substring, not exact equality — the real section is titled "Startup Funding",
    // not "Funding" on its own, and this should keep working if it's ever renamed slightly.
    const fundingSection = sections.find((s) => s.title.trim().toLowerCase().includes('funding'));
    const fundingReportsThisWeek = fundingSection
      ? reports.filter((r) => r.section_id === fundingSection.id && withinLastWeek(r.publish_at || r.created_at)).length
      : 0;

    const cityLower = city.toLowerCase();
    const cityEventsThisWeek = city
      ? events.filter((e) => e.location?.toLowerCase().includes(cityLower) && withinLastWeek(e.created_at)).length
      : 0;

    return NextResponse.json({
      success: true,
      data: { fundingReportsThisWeek, cityEventsThisWeek },
    });
  } catch (error) {
    console.error('GET /api/dashboard/weekly-highlights error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to compute weekly highlights' },
      { status: 500 }
    );
  }
}
