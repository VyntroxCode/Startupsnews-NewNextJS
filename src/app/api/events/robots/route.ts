import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/shared/database/connection';

/**
 * GET /api/events/robots?slug=some-event-slug
 * Returns status info for an event slug — used by proxy to serve 410 for draft events and for
 * slugs with no `partnership_events` row at all (renamed or deleted events). Both are permanent:
 * renaming an event regenerates its slug and orphans the old URL for good, so 404 would only
 * invite months of re-crawling as a soft 404.
 *
 * The miss case is safe to treat as gone precisely because this query mirrors the set of slugs
 * the page can render: data-adapter's getEventBySlug goes through
 * PartnershipEventsService.getPublicEventBySlug, which reads the same table by slug and returns
 * null for `site_status = 'draft'`. Keep the two in step — if the page ever gains a fallback
 * source, a miss here would stop meaning "gone" and this must be relaxed back to 200.
 *
 * Fails open with 200 on a missing param or a DB error — a blip must never 410 a live event.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim();
  if (!slug) return NextResponse.json({ httpStatus: 200 });

  try {
    const row = await queryOne<{ site_status: string | null }>(
      'SELECT site_status FROM partnership_events WHERE slug = ? LIMIT 1',
      [slug]
    );
    // Shorter TTL for a miss than for a hit: a slug can stop being unknown the moment an admin
    // publishes an event under it, whereas a live event's status rarely flips back.
    if (!row) {
      return NextResponse.json({ httpStatus: 410 }, {
        headers: { 'Cache-Control': 'private, max-age=60' },
      });
    }
    const httpStatus = row.site_status === 'draft' ? 410 : 200;
    return NextResponse.json({ httpStatus }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return NextResponse.json({ httpStatus: 200 });
  }
}
