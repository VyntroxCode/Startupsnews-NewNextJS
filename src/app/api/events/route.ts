import { NextRequest, NextResponse } from 'next/server';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { entityToEvent } from '@/modules/events/utils/events.utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Initialize services
const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

/**
 * GET /api/events
 * Get all events with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('location');
    const status = searchParams.get('status') || 'upcoming';
    const limit = searchParams.get('limit');

    const filters: {
      location?: string;
      status?: string;
      limit?: number;
    } = {
      status,
    };

    if (location) {
      filters.location = location;
    }

    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        filters.limit = parsedLimit;
      }
    }

    const entities = await eventsService.getAllEvents(filters);
    const events = entities.map(entityToEvent);

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch events',
      },
      { status: 500 }
    );
  }
}

