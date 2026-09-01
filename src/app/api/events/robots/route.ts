import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/shared/database/connection';

/**
 * GET /api/events/robots?slug=some-event-slug
 * Returns status info for an event slug — used by proxy to serve 410 for draft events.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')?.trim();
  if (!slug) return NextResponse.json({ httpStatus: 200 });

  try {
    const row = await queryOne<{ site_status: string | null }>(
      'SELECT site_status FROM partnership_events WHERE slug = ? LIMIT 1',
      [slug]
    );
    if (!row) return NextResponse.json({ httpStatus: 200 });
    const httpStatus = row.site_status === 'draft' ? 410 : 200;
    return NextResponse.json({ httpStatus }, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return NextResponse.json({ httpStatus: 200 });
  }
}
