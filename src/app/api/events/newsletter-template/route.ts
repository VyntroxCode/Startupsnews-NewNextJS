import { NextRequest, NextResponse } from 'next/server';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { entityToEvent } from '@/modules/events/utils/events.utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

/**
 * GET /api/events/newsletter-template
 * Public endpoint — returns only title, url, location, date for newsletter use.
 * Query params:
 *   status  — default: "upcoming"
 *   limit   — max number of events to return
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'upcoming';
    const limit = searchParams.get('limit');

    const filters: { status?: string; limit?: number } = { status };

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        filters.limit = parsedLimit;
      }
    }

    const entities = await eventsService.getAllEvents(filters);

    const data = entities.map((entity) => {
      const event = entityToEvent(entity);
      return {
        title: event.title,
        url: event.url,
        location: event.location,
        date: event.date,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error('Error fetching newsletter template events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      },
      { status: 500 }
    );
  }
}
