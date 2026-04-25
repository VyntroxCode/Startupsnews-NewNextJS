import { EventsRepository } from '../repository/events.repository';
import { EventEntity, CreateEventDto, UpdateEventDto } from '../domain/types';
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from '@/shared/cache/redis.client';

export class EventsService {
  constructor(private repository: EventsRepository) { }

  async getAllEvents(filters?: {
    location?: string;
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<EventEntity[]> {
    const cacheKey = `events:all:${JSON.stringify(filters)}`;
    const cached = await getCache<EventEntity[]>(cacheKey);
    if (cached) return cached;

    const events = await this.repository.findAll(filters);

    await setCache(cacheKey, events, 300);
    return events;
  }

  /**
   * Events for public (sidebar, /events page): event_date >= today, status upcoming or ongoing.
   * Does not mutate DB. Cached under events:public:upcoming.
   * If the strict query returns none, fallback to event_date >= today (any status) so we still show events.
   */
  async getUpcomingForPublic(): Promise<EventEntity[]> {
    const cacheKey = 'events:public:upcoming';
    const cached = await getCache<EventEntity[]>(cacheKey);
    if (cached) return cached;

    let events = await this.repository.findForPublicUpcoming();
    if (events.length === 0) {
      events = await this.repository.findForPublicUpcomingByDateOnly();
    }
    await setCache(cacheKey, events, events.length === 0 ? 60 : 300);
    return events;
  }

  async countEvents(filters?: {
    location?: string;
    status?: string;
    search?: string;
  }): Promise<number> {
    return this.repository.count(filters);
  }

  async getEventById(id: number): Promise<EventEntity | null> {
    const cacheKey = `event:id:${id}`;

    const cached = await getCache<EventEntity>(cacheKey);
    if (cached) return cached;

    const entity = await this.repository.findById(id);
    if (entity) {
      await setCache(cacheKey, entity, 600); // Cache for 10 minutes
    }
    return entity;
  }

  async getEventBySlug(slug: string): Promise<EventEntity | null> {
    const cacheKey = `event:slug:${slug}`;

    const cached = await getCache<EventEntity>(cacheKey);
    if (cached) return cached;

    const entity = await this.repository.findBySlug(slug);
    if (entity) {
      await setCache(cacheKey, entity, 600); // Cache for 10 minutes
    }
    return entity;
  }

  /**
   * Create event
   */
  async createEvent(data: CreateEventDto): Promise<EventEntity> {
    // Generate a unique slug based on title if no slug is provided or it's empty
    let currentSlug = data.slug && data.slug.trim() ? data.slug : data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slugExists = await this.repository.slugExists(currentSlug);
    let counter = 1;

    while (slugExists) {
      currentSlug = `${data.slug || data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${counter}`;
      slugExists = await this.repository.slugExists(currentSlug);
      counter++;
    }

    // Convert eventDate string to Date if needed
    const eventDate = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;

    const entity = await this.repository.create({
      ...data,
      slug: currentSlug,
      eventDate,
      // Coerce null → undefined so the repo signature (string | undefined) is satisfied
      eventTime: data.eventTime ?? undefined,
    });

    // Invalidate cache
    await this.invalidateEventCache();

    return entity;
  }

  /**
   * Update event
   */
  async updateEvent(id: number, data: Partial<CreateEventDto>): Promise<EventEntity> {
    const existingEvent = await this.repository.findById(id);
    if (!existingEvent) {
      throw new Error(`Event with ID ${id} not found`);
    }

    // Convert camelCase to snake_case for database
    const updateData: Partial<EventEntity> = {};
    if (data.title !== undefined) updateData.title = data.title;

    if (data.slug !== undefined && data.slug !== existingEvent.slug) {
      let currentSlug = data.slug && data.slug.trim() ? data.slug : (data.title || existingEvent.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let slugExists = await this.repository.slugExists(currentSlug, id);
      let counter = 1;

      while (slugExists) {
        currentSlug = `${data.slug || (data.title || existingEvent.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${counter}`;
        slugExists = await this.repository.slugExists(currentSlug, id);
        counter++;
      }
      updateData.slug = currentSlug;
    }
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.eventDate !== undefined) {
      updateData.event_date = typeof data.eventDate === 'string' ? new Date(data.eventDate) : data.eventDate;
    }
    if (data.eventTime !== undefined) updateData.event_time = data.eventTime;
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
    if (data.externalUrl !== undefined) updateData.external_url = data.externalUrl;
    if (data.status !== undefined) updateData.status = data.status;

    const entity = await this.repository.update(id, updateData);

    // Invalidate cache
    await this.invalidateEventCache();
    if (entity.slug) {
      await deleteCache(`event:slug:${entity.slug}`);
    }
    await deleteCache(`event:id:${id}`);

    return entity;
  }

  /**
   * Delete event
   */
  async deleteEvent(id: number): Promise<void> {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new Error(`Event with ID ${id} not found`);
    }

    await this.repository.delete(id);

    // Invalidate cache
    await this.invalidateEventCache();
    await deleteCache(`event:slug:${event.slug}`);
    await deleteCache(`event:id:${id}`);
  }

  /**
   * Invalidate all event caches so public events section and admin see fresh data
   */
  private async invalidateEventCache(): Promise<void> {
    await Promise.all([
      deleteCacheByPrefix('events:all:'),
      deleteCacheByPrefix('events:by-region:'),
      deleteCacheByPrefix('events:public:'),
      deleteCache('events:startup:public:list'),
    ]);
  }
}

