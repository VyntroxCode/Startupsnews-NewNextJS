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
  downloadAndUploadManualPostImageToS3,
} from '@/modules/rss-feeds/utils/image-to-s3';
import { extractImageUrlsFromHtml } from '@/modules/rss-feeds/utils/content-extract';
import { parseJsonBody } from '@/shared/utils/parse-json-body';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const maxDuration = 60;

// Initialize services
const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);

/**
 * GET /api/admin/events
 * Get all events (admin view - includes all statuses) with pagination
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
    // Keep DB status in sync: mark events with past dates as 'past' when admin loads list
    await eventsRepository.markPastEventsAsExpired();

    const searchParams = request.nextUrl.searchParams;
    const location = searchParams.get('location');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const filters: {
      location?: string;
      status?: string;
      limit?: number;
      offset?: number;
      search?: string;
    } = {
      limit: Math.min(limit, 100), // Max 100 items per page
      offset,
    };

    if (location) {
      filters.location = location;
    }

    if (status) {
      filters.status = status;
    }

    if (search) {
      filters.search = search;
    }

    const countFilters: { location?: string; status?: string; search?: string } = {};
    if (location) countFilters.location = location;
    if (status) countFilters.status = status;
    if (search) countFilters.search = search;

    const [total, entities] = await Promise.all([
      eventsService.countEvents(countFilters),
      eventsService.getAllEvents(filters),
    ]);
    const events = entities.map(entityToEvent);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: events,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
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

/**
 * POST /api/admin/events
 * Create new event. Accepts multipart with imageFile (same as RSS: upload to S3 server-side).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, 'editor');
  if (auth instanceof NextResponse) return auth;

  try {
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
    const decodedEventTime = decodeBase64Utf8(body.eventTimeBase64);
    const decodedExternalUrl = decodeBase64Utf8(body.externalUrlBase64);

    if (decodedTitle !== null) body.title = decodedTitle;
    if (decodedSlug !== null) body.slug = decodedSlug;
    if (decodedExcerpt !== null) body.excerpt = decodedExcerpt;
    if (decodedDescription !== null) body.description = decodedDescription;
    if (decodedLocation !== null) body.location = decodedLocation;
    if (decodedEventDate !== null) body.eventDate = decodedEventDate;
    if (decodedEventTime !== null) body.eventTime = decodedEventTime;
    if (decodedExternalUrl !== null) body.externalUrl = decodedExternalUrl;

    // Validation
    if (!body.title || !body.location || !body.eventDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title, location, and event date are required',
        },
        { status: 400 }
      );
    }

    // Auto-generate slug if missing
    if (!body.slug || typeof body.slug !== 'string' || !body.slug.trim()) {
      body.slug = String(body.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    let imageUrl: string | undefined = body.imageUrl ? String(body.imageUrl).trim() : undefined;

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
        const bytes = await imageFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = (imageFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const contentTypeImg = CONTENT_TYPES[ext] || imageFile.type || 'image/jpeg';
        const key = s3KeyForEventImage(String(body.slug), imageFile.name);
        imageUrl = await uploadImageToS3(key, buffer, contentTypeImg);
      } catch (err) {
        console.error('Event create: failed to upload image file to S3', err);
        return NextResponse.json(
          { success: false, error: 'Failed to upload image to storage. Please try again.' },
          { status: 500 }
        );
      }
    }

    if (imageUrl && isS3Configured() && !isOurS3ImageUrl(imageUrl)) {
      try {
        const s3Url = await downloadAndUploadEventImageToS3(String(body.slug), imageUrl);
        if (s3Url) imageUrl = s3Url;
      } catch (err) {
        console.error('Event create: failed to upload image URL to S3', err);
      }
    }

    // Process images in description
    let processedDescription = body.description != null ? String(body.description) : undefined;
    if (isS3Configured() && processedDescription) {
      try {
        const contentImages = extractImageUrlsFromHtml(processedDescription, '');
        const urlToS3 = new Map<string, string>();

        for (const imgUrl of contentImages) {
          if (isOurS3ImageUrl(imgUrl)) continue;

          try {
            // Re-use manual post logic as generic "download and upload to S3" for content images
            // Or we could create a specific event content helper, but manual post one is fine (uploads/YYYY/MM/manual-...)
            const s3Url = await downloadAndUploadManualPostImageToS3(imgUrl);
            if (s3Url) {
              urlToS3.set(imgUrl, s3Url);
            }
          } catch (err) {
            console.error(`Failed to upload event description image: ${imgUrl}`, err);
          }
        }

        if (urlToS3.size > 0) {
          for (const [oldUrl, newUrl] of urlToS3) {
            processedDescription = processedDescription.split(oldUrl).join(newUrl);
          }
        }
      } catch (err) {
        console.error('Error processing event description images:', err);
      }
    }

    const entity = await eventsService.createEvent({
      title: String(body.title),
      slug: String(body.slug),
      excerpt: body.excerpt != null ? String(body.excerpt) : undefined,
      description: processedDescription,
      location: String(body.location),
      eventDate: String(body.eventDate),
      eventTime: body.eventTime ? String(body.eventTime).trim() : undefined,
      imageUrl,
      externalUrl: body.externalUrl != null ? String(body.externalUrl) : undefined,
      status: (body.status as 'upcoming' | 'ongoing' | 'past' | 'cancelled') || 'upcoming',
    });

    const event = entityToEvent(entity);

    return NextResponse.json({
      success: true,
      data: event,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create event',
      },
      { status: 500 }
    );
  }
}
