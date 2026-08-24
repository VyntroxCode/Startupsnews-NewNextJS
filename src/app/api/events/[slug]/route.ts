import { NextRequest, NextResponse } from 'next/server';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { entityToEvent } from '@/modules/events/utils/events.utils';
import { toCdnUrl } from '@/shared/utils/image-cdn';

// Initialize services
const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

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
    const entity = await eventsService.getEventBySlug(slug);

    if (!entity) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    if (entity.status === 'draft') {
      return NextResponse.json({ success: false, error: 'Event not available' }, { status: 410 });
    }

    const event = entityToEvent(entity);
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

