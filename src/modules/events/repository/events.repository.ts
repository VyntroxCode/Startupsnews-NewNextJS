import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { EventEntity } from '../domain/types';

export class EventsRepository {
  async findAll(filters?: {
    location?: string;
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<EventEntity[]> {
    let sql = 'SELECT * FROM events WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters?.location) {
      sql += ' AND location = ?';
      params.push(filters.location);
    }

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
      // Expire by date: upcoming = future or today; past = before today; ongoing = today only
      if (filters.status === 'upcoming') {
        sql += ' AND event_date >= CURDATE()';
      } else if (filters.status === 'past') {
        sql += ' AND event_date < CURDATE()';
      } else if (filters.status === 'ongoing') {
        sql += ' AND event_date = CURDATE()';
      }
    }

    if (filters?.search) {
      sql += ' AND (title LIKE ? OR slug LIKE ? OR location LIKE ? OR excerpt LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Sort: upcoming events first (nearest first), then past events (most recent first)
    sql += ' ORDER BY (event_date < CURDATE()), IF(event_date >= CURDATE(), event_date, "9999-12-31") ASC, IF(event_date < CURDATE(), event_date, "1900-01-01") DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return query<EventEntity>(sql, params);
  }

  /**
   * Events for public display: event_date >= today and status upcoming or ongoing.
   * Does not mutate DB. Use this for /events page and sidebar so public always sees by date.
   */
  async findForPublicUpcoming(): Promise<EventEntity[]> {
    const sql = `SELECT * FROM events
      WHERE event_date >= CURDATE() AND status IN ('upcoming', 'ongoing')
      ORDER BY event_date ASC`;
    return query<EventEntity>(sql, []);
  }

  /**
   * Fallback: events with event_date >= today, any status (so we show events even if status was mis-set to 'past').
   */
  async findForPublicUpcomingByDateOnly(): Promise<EventEntity[]> {
    const sql = `SELECT * FROM events WHERE event_date >= CURDATE() ORDER BY event_date ASC`;
    return query<EventEntity>(sql, []);
  }

  /**
   * Count events with optional filters
   */
  async count(filters?: {
    location?: string;
    status?: string;
    search?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM events WHERE 1=1';
    const params: (string | number)[] = [];

    if (filters?.location) {
      sql += ' AND location = ?';
      params.push(filters.location);
    }

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
      if (filters.status === 'upcoming') {
        sql += ' AND event_date >= CURDATE()';
      } else if (filters.status === 'past') {
        sql += ' AND event_date < CURDATE()';
      } else if (filters.status === 'ongoing') {
        sql += ' AND event_date = CURDATE()';
      }
    }

    if (filters?.search) {
      sql += ' AND (title LIKE ? OR slug LIKE ? OR location LIKE ? OR excerpt LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const result = await queryOne<{ count: number | bigint }>(sql, params);
    // Convert BigInt to Number (MariaDB COUNT() returns BigInt)
    const count = result?.count;
    return count ? Number(count) : 0;
  }

  /**
   * Set status to 'past' for events whose event_date is before today and status is 'upcoming' or 'ongoing'.
   * Call this so the DB status stays in sync and admin/APIs see correct status.
   */
  async markPastEventsAsExpired(): Promise<void> {
    await query(
      `UPDATE events SET status = 'past'
       WHERE status IN ('upcoming', 'ongoing') AND event_date < CURDATE()`
    );
  }

  async findById(id: number): Promise<EventEntity | null> {
    return queryOne<EventEntity>('SELECT * FROM events WHERE id = ?', [id]);
  }

  async findBySlug(slug: string): Promise<EventEntity | null> {
    return queryOne<EventEntity>('SELECT * FROM events WHERE slug = ?', [slug]);
  }

  /**
   * Normalize event date for MySQL DATE column (YYYY-MM-DD string to avoid timezone issues)
   */
  private normalizeEventDate(eventDate: Date | string): string {
    if (typeof eventDate === 'string') {
      const trimmed = eventDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      const d = new Date(trimmed);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    const d = eventDate instanceof Date ? eventDate : new Date(eventDate);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Create new event
   */
  async create(data: {
    title: string;
    slug: string;
    excerpt?: string;
    description?: string;
    location: string;
    eventDate: Date | string;
    eventTime?: string;
    imageUrl?: string;
    externalUrl?: string;
    status?: 'upcoming' | 'ongoing' | 'past' | 'cancelled';
  }): Promise<EventEntity> {
    const sql = `
      INSERT INTO events (
        title, slug, excerpt, description, location, event_date, event_time,
        image_url, external_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const eventDateStr = this.normalizeEventDate(data.eventDate);
    const params = [
      data.title,
      data.slug,
      data.excerpt || null,
      data.description || null,
      data.location,
      eventDateStr,
      data.eventTime || null,
      data.imageUrl || null,
      data.externalUrl || null,
      data.status || 'upcoming',
    ];

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(sql, params) as { insertId?: number };
      const insertId = result.insertId;
      if (!insertId) {
        throw new Error('Failed to get insert ID');
      }
      return this.findById(insertId) as Promise<EventEntity>;
    } finally {
      connection.release();
    }
  }

  /**
   * Update event
   */
  async update(id: number, data: Partial<EventEntity>): Promise<EventEntity> {
    const fields: string[] = [];
    const params: (string | number | Date | null)[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        // Convert camelCase to snake_case for database
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        // Normalize event_date to YYYY-MM-DD for MySQL DATE
        if (key === 'event_date' && (value instanceof Date || typeof value === 'string')) {
          params.push(this.normalizeEventDate(value as Date | string));
        } else {
          params.push(value as string | number | Date | null);
        }
      }
    });

    if (fields.length === 0) {
      return this.findById(id) as Promise<EventEntity>;
    }

    params.push(id);
    await query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id) as Promise<EventEntity>;
  }

  /**
   * Delete event
   */
  async delete(id: number): Promise<void> {
    await query('DELETE FROM events WHERE id = ?', [id]);
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM events WHERE slug = ?';
    const params: (string | number)[] = [slug];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await queryOne<{ count: number | bigint }>(sql, params);
    // Convert BigInt to Number (MariaDB COUNT() returns BigInt)
    const count = result?.count;
    return count ? Number(count) > 0 : false;
  }
}

