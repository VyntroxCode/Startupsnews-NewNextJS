import { NextRequest, NextResponse } from 'next/server';
import { PartnershipEventsRepository } from '@/modules/partnership-events/repository/partnership-events.repository';
import { partnershipEntityToStartupEvent } from '@/modules/partnership-events/utils/public-event.utils';
import { toCdnUrl } from '@/shared/utils/image-cdn';

const partnershipEventsRepository = new PartnershipEventsRepository();

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/events/[slug]
 * Get event by slug
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { slug } = await params;
    const entity = await partnershipEventsRepository.findBySlug(slug);

    if (!entity) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    if (entity.site_status === 'draft') {
      return NextResponse.json({ success: false, error: 'Event not available' }, { status: 410 });
    }

    const event = partnershipEntityToStartupEvent(entity);
    // CDN rewrite only on this public display path — see shared/utils/image-cdn.ts.
    event.image = toCdnUrl(event.image) || event.image;

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch event',
      },
      { status: 500 }
    );
  }
}
