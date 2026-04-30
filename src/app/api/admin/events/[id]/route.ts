import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/shared/middleware/auth.middleware';
import { EventsService } from '@/modules/events/service/events.service';
import { EventsRepository } from '@/modules/events/repository/events.repository';
import { entityToEvent } from '@/modules/events/utils/events.utils';
import {
  isS3Configured,
  isOurS3ImageUrl,
  downloadAndUploadEventImageToS3,
  uploadImageToS3,
  s3KeyForEventImage,
} from '@/modules/rss-feeds/utils/image-to-s3';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { EventEntity } from '@/modules/events/domain/types';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Initialize services
const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

function entityToAdminEvent(entity: EventEntity) {
  const eventDate = entity.event_date ? new Date(entity.event_date).toISOString().split('T')[0] : '';
  const eventEndDate = entity.event_end_date ? new Date(entity.event_end_date).toISOString().split('T')[0] : '';
  return {
    id: entity.id.toString(),
    slug: entity.slug,
    title: entity.title,
    excerpt: entity.excerpt || '',
    description: entity.description || '',
    location: entity.location,
    date: eventDate,
    eventEndDate,
    eventTime: entity.event_time || '',
    eventEndTime: entity.event_end_time || '',
    image: entity.image_url || '',
    url: entity.external_url || '',
    status: entity.status,
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/events/[id]
 * Get event by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid event ID',
        },
        { status: 400 }
      );
    }

    const entity = await eventsService.getEventById(eventId);

    if (!entity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    const event = entityToAdminEvent(entity);

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

/**
 * PUT /api/admin/events/[id]
 * Update event
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid event ID',
        },
        { status: 400 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, unknown>;
    let imageFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      imageFile = (formData.get('imageFile') as File) || null;
      if (imageFile && typeof imageFile === 'object' && imageFile.size === 0) imageFile = null;
      body = {
        title: formData.get('title'),
        slug: formData.get('slug'),
        excerpt: formData.get('excerpt'),
        description: formData.get('description'),
        location: formData.get('location'),
        eventDate: formData.get('eventDate'),
        eventTime: formData.get('eventTime'),
        imageUrl: formData.get('imageUrl'),
        externalUrl: formData.get('externalUrl'),
        status: formData.get('status'),
      };
    } else {
      const [parsed, parseError] = await parseJsonBody<Record<string, unknown>>(request);
      if (parseError) return parseError;
      body = parsed || {};
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body is required' },
        { status: 400 }
      );
    }

    const decodeBase64Utf8 = (value: unknown): string | null => {
      if (typeof value !== 'string' || !value.trim()) return null;
      try {
        return Buffer.from(value, 'base64').toString('utf8');
      } catch {
        return null;
      }
    };

    const decodedTitle = decodeBase64Utf8(body.titleBase64);
    const decodedSlug = decodeBase64Utf8(body.slugBase64);
    const decodedExcerpt = decodeBase64Utf8(body.excerptBase64);
    const decodedDescription = decodeBase64Utf8(body.descriptionBase64);
    const decodedLocation = decodeBase64Utf8(body.locationBase64);
    const decodedEventDate = decodeBase64Utf8(body.eventDateBase64);
    const decodedEventEndDate = decodeBase64Utf8(body.eventEndDateBase64);
    const decodedEventTime = decodeBase64Utf8(body.eventTimeBase64);
    const decodedEventEndTime = decodeBase64Utf8(body.eventEndTimeBase64);
    const decodedExternalUrl = decodeBase64Utf8(body.externalUrlBase64);

    if (decodedTitle !== null) body.title = decodedTitle;
    if (decodedSlug !== null) body.slug = decodedSlug;
    if (decodedExcerpt !== null) body.excerpt = decodedExcerpt;
    if (decodedDescription !== null) body.description = decodedDescription;
    if (decodedLocation !== null) body.location = decodedLocation;
    if (decodedEventDate !== null) body.eventDate = decodedEventDate;
    if (decodedEventEndDate !== null) body.eventEndDate = decodedEventEndDate;
    if (decodedEventTime !== null) body.eventTime = decodedEventTime;
    if (decodedEventEndTime !== null) body.eventEndTime = decodedEventEndTime;
    if (decodedExternalUrl !== null) body.externalUrl = decodedExternalUrl;

    const updateData: Partial<{
      title: string;
      slug: string;
      excerpt: string;
      description: string;
      location: string;
      eventDate: Date | string;
      eventEndDate: Date | string | null;
      eventTime: string | null;
      eventEndTime: string | null;
      imageUrl: string | undefined;
      externalUrl: string;
      status: 'upcoming' | 'ongoing' | 'past' | 'cancelled';
    }> = {};

    if (body.title !== undefined) updateData.title = String(body.title);
    if (body.slug !== undefined) updateData.slug = String(body.slug);
    if (body.excerpt !== undefined) updateData.excerpt = String(body.excerpt);
    if (body.description !== undefined) updateData.description = String(body.description);
    if (body.location !== undefined) updateData.location = String(body.location);
    if (body.eventDate !== undefined) updateData.eventDate = body.eventDate as Date | string;
    if (body.eventEndDate !== undefined) updateData.eventEndDate = body.eventEndDate ? body.eventEndDate as Date | string : null;
    if (body.eventTime !== undefined) updateData.eventTime = body.eventTime ? String(body.eventTime).trim() : null;
    if (body.eventEndTime !== undefined) updateData.eventEndTime = body.eventEndTime ? String(body.eventEndTime).trim() : null;

    if (imageFile && isS3Configured()) {
      try {
        if (imageFile.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { success: false, error: `Image must be under ${MAX_FILE_SIZE / 1024 / 1024}MB` },
            { status: 400 }
          );
        }
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(imageFile.type)) {
          return NextResponse.json(
            { success: false, error: 'Invalid image type. Use JPEG, PNG, GIF, or WebP.' },
            { status: 400 }
          );
        }
        const slug = body.slug != null ? String(body.slug) : (await eventsService.getEventById(eventId))?.slug ?? `event-${eventId}`;
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = (imageFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const contentTypeImg = CONTENT_TYPES[ext] || imageFile.type || 'image/jpeg';
        const key = s3KeyForEventImage(slug, imageFile.name);
        updateData.imageUrl = await uploadImageToS3(key, buffer, contentTypeImg);
      } catch (err) {
        console.error('Event update: failed to upload image file to S3', err);
        return NextResponse.json(
          { success: false, error: 'Failed to upload image to storage. Please try again.' },
          { status: 500 }
        );
      }
    }

    if (body.imageUrl !== undefined) {
      let imageUrl = body.imageUrl != null ? String(body.imageUrl).trim() : undefined;
      if (imageUrl && isS3Configured() && !isOurS3ImageUrl(imageUrl)) {
        try {
          const slug = body.slug != null ? String(body.slug) : (await eventsService.getEventById(eventId))?.slug ?? `event-${eventId}`;
          const s3Url = await downloadAndUploadEventImageToS3(slug, imageUrl);
          if (s3Url) imageUrl = s3Url;
        } catch (err) {
          console.error('Event update: failed to upload image URL to S3', err);
        }
      }
      updateData.imageUrl = imageUrl;
    }
    if (body.externalUrl !== undefined) updateData.externalUrl = String(body.externalUrl);
    if (body.status !== undefined) updateData.status = body.status as 'upcoming' | 'ongoing' | 'past' | 'cancelled';

    const entity = await eventsService.updateEvent(eventId, updateData);
    const event = entityToEvent(entity);

    return NextResponse.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update event',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/events/[id]
 * Delete event
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid event ID',
        },
        { status: 400 }
      );
    }

    await eventsService.deleteEvent(eventId);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete event',
      },
      { status: 500 }
    );
  }
}

