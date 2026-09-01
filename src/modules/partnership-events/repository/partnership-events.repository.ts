import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { PartnershipEventEntity, PartnershipEventFilters, PartnershipEventInput } from '../domain/types';

type SqlParam = string | number | null;

const WRITABLE_COLUMNS: Array<[keyof PartnershipEventInput, string]> = [
  ['eventName', 'event_name'],
  ['slug', 'slug'],
  ['siteStatus', 'site_status'],
  ['city', 'city'],
  ['country', 'country'],
  ['organiser', 'organiser'],
  ['poc', 'poc'],
  ['contact', 'contact'],
  ['email', 'email'],
  ['website', 'website'],
  ['emailThread', 'email_thread'],
  ['initiatedDate', 'initiated_date'],
  ['eventStartDate', 'event_start_date'],
  ['eventStartTime', 'event_start_time'],
  ['eventEndDate', 'event_end_date'],
  ['eventEndTime', 'event_end_time'],
  ['venueAddress', 'venue_address'],
  ['googleLocationLink', 'google_location_link'],
  ['description', 'description'],
  ['eventType', 'event_type'],
  ['ticketCurrency', 'ticket_currency'],
  ['ticketPrice', 'ticket_price'],
  ['speakers', 'speakers'],
  ['posterUrl', 'poster_url'],
  ['bannerUrl', 'banner_url'],
  ['bannerStartDate', 'banner_start_date'],
  ['bannerActive', 'banner_active'],
  ['socialMediaPosts', 'social_media_posts'],
  ['socialCreatives', 'social_creatives'],
  ['partnershipStatus', 'partnership_status'],
  ['partnershipType', 'partnership_type'],
  ['lastUpdatedDate', 'last_updated_date'],
  ['comment', 'comment'],
  ['listing', 'listing'],
  ['listingLink', 'listing_link'],
  ['source', 'source'],
];

const JSON_COLUMNS = new Set<keyof PartnershipEventInput>(['speakers', 'socialCreatives']);
const DATE_COLUMNS = new Set<keyof PartnershipEventInput>(['initiatedDate', 'eventStartDate', 'eventEndDate', 'lastUpdatedDate', 'bannerStartDate']);
// TINYINT(1) columns: a JS boolean has to reach MySQL as 1/0, not as `true`/`false`.
const BOOL_COLUMNS = new Set<keyof PartnershipEventInput>(['bannerActive']);

function toParam(key: keyof PartnershipEventInput, value: unknown): SqlParam {
  if (JSON_COLUMNS.has(key)) return JSON.stringify(value || []);
  if (BOOL_COLUMNS.has(key)) return value ? 1 : 0;
  if (DATE_COLUMNS.has(key) && value === '') return null;
  return (value as string | null | undefined) ?? null;
}

function buildWhere(filters?: PartnershipEventFilters): { sql: string; params: SqlParam[] } {
  let sql = 'WHERE 1=1';
  const params: SqlParam[] = [];

  if (filters?.search) {
    sql += ' AND (event_name LIKE ? OR organiser LIKE ? OR poc LIKE ? OR city LIKE ? OR country LIKE ? OR comment LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, term, term);
  }
  if (filters?.status) {
    sql += ' AND partnership_status = ?';
    params.push(filters.status);
  }
  return { sql, params };
}

export class PartnershipEventsRepository {
  async findAll(filters?: PartnershipEventFilters): Promise<PartnershipEventEntity[]> {
    const { sql: whereSql, params } = buildWhere(filters);
    let sql = `SELECT * FROM partnership_events ${whereSql} ORDER BY event_start_date DESC, created_at DESC`;
    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
    return query<PartnershipEventEntity>(sql, params);
  }

  /**
   * Flip partnership_status to 'Expired' for events whose date has quietly passed while still
   * "in the pipeline" — call this so the status actually reflects reality instead of relying on
   * someone remembering to set it by hand (see markPastEventsAsExpired on EventsRepository for
   * the equivalent sweep on the public site's own event status).
   * - Only touches events never actually listed (event_id IS NULL) — once an event has a real,
   *   published website Event linked, it's treated as still current/upcoming rather than force-
   *   flipped, regardless of the tracker's own dates.
   * - Only touches events still in a non-terminal status — Partnership Done / Dropped / Only
   *   Listing / already-Expired are left alone so a resolved outcome is never silently
   *   overwritten. ('Only Listed (No Partnership)' was the pre-STATUS_EDIT_ORDER wording for
   *   'Only Listing'; its rows were migrated by scripts/migrate-only-listed-to-only-listing.ts,
   *   so the modern spelling carries that same terminal protection here.)
   */
  async markPastPartnershipsAsExpired(): Promise<void> {
    await query(
      `UPDATE partnership_events
       SET partnership_status = 'Expired'
       WHERE event_id IS NULL
       AND COALESCE(event_end_date, event_start_date) IS NOT NULL
       AND COALESCE(event_end_date, event_start_date) < CURDATE()
       AND partnership_status NOT IN ('Partnership Done', 'Dropped', 'Only Listing', 'Expired')`
    );
  }

  async count(filters?: PartnershipEventFilters): Promise<number> {
    const { sql: whereSql, params } = buildWhere(filters);
    const row = await queryOne<{ total: number | bigint }>(`SELECT COUNT(*) as total FROM partnership_events ${whereSql}`, params);
    return Number(row?.total || 0);
  }

  async findById(id: number): Promise<PartnershipEventEntity | null> {
    return queryOne<PartnershipEventEntity>('SELECT * FROM partnership_events WHERE id = ?', [id]);
  }

  async findBySlug(slug: string): Promise<PartnershipEventEntity | null> {
    return queryOne<PartnershipEventEntity>('SELECT * FROM partnership_events WHERE slug = ?', [slug]);
  }

  /**
   * Public listing query — mirrors EventsRepository.findForPublicUpcoming, now against
   * partnership_events directly instead of its shadow copy in `events`.
   */
  async findForPublicUpcoming(): Promise<PartnershipEventEntity[]> {
    return query<PartnershipEventEntity>(
      `SELECT * FROM partnership_events
       WHERE site_status = 'upcoming' AND event_start_date >= CURDATE()
       ORDER BY event_start_date ASC`
    );
  }

  async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM partnership_events WHERE slug = ?';
    const params: SqlParam[] = [slug];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const result = await queryOne<{ count: number | bigint }>(sql, params);
    return Number(result?.count || 0) > 0;
  }

  /**
   * Flip site_status to 'completed' once the event's date has passed — mirrors
   * EventsRepository.markPastEventsAsExpired's rule (end date if set, else start date).
   */
  async markSiteStatusPastAsCompleted(): Promise<void> {
    await query(
      `UPDATE partnership_events SET site_status = 'completed'
       WHERE site_status = 'upcoming'
       AND COALESCE(event_end_date, event_start_date) < CURDATE()`
    );
  }

  async create(input: PartnershipEventInput, actor?: string): Promise<PartnershipEventEntity> {
    const columns = ['event_name', 'created_by', 'updated_by'];
    const placeholders = ['?', '?', '?'];
    const params: SqlParam[] = [input.eventName, actor || null, actor || null];

    for (const [key, column] of WRITABLE_COLUMNS) {
      if (key === 'eventName') continue;
      columns.push(column);
      placeholders.push('?');
      params.push(toParam(key, input[key]));
    }

    const sql = `INSERT INTO partnership_events (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      const result = (await connection.query(sql, params)) as { insertId?: number | bigint };
      const insertId = Number(result.insertId);
      if (!insertId) throw new Error('Failed to get insert ID for new partnership event');
      const created = await this.findById(insertId);
      if (!created) throw new Error('Partnership event created but could not be reloaded');
      return created;
    } finally {
      connection.release();
    }
  }

  async update(id: number, input: Partial<PartnershipEventInput>, actor?: string): Promise<PartnershipEventEntity | null> {
    const fields: string[] = [];
    const params: SqlParam[] = [];

    for (const [key, column] of WRITABLE_COLUMNS) {
      if (!(key in input)) continue;
      fields.push(`${column} = ?`);
      params.push(toParam(key, input[key]));
    }
    if (actor) {
      fields.push('updated_by = ?');
      params.push(actor);
    }
    if (!fields.length) return this.findById(id);

    params.push(id);
    await query(`UPDATE partnership_events SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  /** Records the id of the auto-created linked Event the first time one gets created for this record. */
  async setEventId(id: number, eventId: number): Promise<void> {
    await query('UPDATE partnership_events SET event_id = ? WHERE id = ?', [eventId, id]);
  }

  /** Same idea as setEventId, for the auto-managed homepage `banners` row (see syncHomepageBanner). */
  async setBannerId(id: number, bannerId: number | null): Promise<void> {
    await query('UPDATE partnership_events SET banner_id = ? WHERE id = ?', [bannerId, id]);
  }

  async delete(id: number): Promise<void> {
    await query('DELETE FROM partnership_events WHERE id = ?', [id]);
  }

  async bulkDelete(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await query(`DELETE FROM partnership_events WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  }
}
