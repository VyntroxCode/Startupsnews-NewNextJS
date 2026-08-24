import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { PartnershipEventEntity, PartnershipEventFilters, PartnershipEventInput } from '../domain/types';

type SqlParam = string | number | null;

const WRITABLE_COLUMNS: Array<[keyof PartnershipEventInput, string]> = [
  ['eventName', 'event_name'],
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
const DATE_COLUMNS = new Set<keyof PartnershipEventInput>(['initiatedDate', 'eventStartDate', 'eventEndDate', 'lastUpdatedDate']);

function toParam(key: keyof PartnershipEventInput, value: unknown): SqlParam {
  if (JSON_COLUMNS.has(key)) return JSON.stringify(value || []);
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
   *   Listed (No Partnership) / already-Expired are left alone so a resolved outcome is never
   *   silently overwritten.
   */
  async markPastPartnershipsAsExpired(): Promise<void> {
    await query(
      `UPDATE partnership_events
       SET partnership_status = 'Expired'
       WHERE event_id IS NULL
       AND COALESCE(event_end_date, event_start_date) IS NOT NULL
       AND COALESCE(event_end_date, event_start_date) < CURDATE()
       AND partnership_status NOT IN ('Partnership Done', 'Dropped', 'Only Listed (No Partnership)', 'Expired')`
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

  async delete(id: number): Promise<void> {
    await query('DELETE FROM partnership_events WHERE id = ?', [id]);
  }

  async bulkDelete(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await query(`DELETE FROM partnership_events WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  }
}
