import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { BulkAction, ContactEntity, ContactFilters, ContactInput } from '../domain/types';
import { parseArray } from '../utils/contacts.utils';

type SqlParam = string | number | null;

function buildWhere(filters?: ContactFilters): { sql: string; params: SqlParam[] } {
  let sql = 'WHERE 1=1';
  const params: SqlParam[] = [];

  if (filters?.search) {
    sql += ' AND (name LIKE ? OR company LIKE ? OR notes LIKE ? OR sector LIKE ? OR country LIKE ? OR emails LIKE ? OR phones LIKE ? OR cities LIKE ? OR tags LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, term, term, term, term, term);
  }
  if (filters?.city) {
    sql += ' AND JSON_CONTAINS(cities, JSON_QUOTE(?))';
    params.push(filters.city);
  }
  if (filters?.country) {
    sql += ' AND country = ?';
    params.push(filters.country);
  }
  if (filters?.type) {
    sql += ' AND JSON_CONTAINS(types, JSON_QUOTE(?))';
    params.push(filters.type);
  }
  if (filters?.tag) {
    sql += ' AND JSON_CONTAINS(tags, JSON_QUOTE(?))';
    params.push(filters.tag);
  }
  return { sql, params };
}

export class ContactsRepository {
  async findAll(filters?: ContactFilters): Promise<ContactEntity[]> {
    const { sql: whereSql, params } = buildWhere(filters);
    let sql = `SELECT * FROM contacts ${whereSql} ORDER BY created_at DESC`;
    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
    return query<ContactEntity>(sql, params);
  }

  async count(filters?: ContactFilters): Promise<number> {
    const { sql: whereSql, params } = buildWhere(filters);
    const row = await queryOne<{ total: number | bigint }>(`SELECT COUNT(*) as total FROM contacts ${whereSql}`, params);
    return Number(row?.total || 0);
  }

  async findById(id: number): Promise<ContactEntity | null> {
    return queryOne<ContactEntity>('SELECT * FROM contacts WHERE id = ?', [id]);
  }

  /** Lightweight id -> emails/phones lookup used to detect duplicates during import, without loading full rows. */
  async findEmailPhoneIndex(): Promise<{ id: number; emails: string[]; phones: string[] }[]> {
    const rows = await query<Pick<ContactEntity, 'id' | 'emails' | 'phones'>>('SELECT id, emails, phones FROM contacts');
    return rows.map((r) => ({ id: r.id, emails: parseArray(r.emails), phones: parseArray(r.phones) }));
  }

  async create(input: ContactInput, actor?: string): Promise<ContactEntity> {
    const sql = `INSERT INTO contacts
      (name, company, types, cities, country, emails, phones, linkedin, instagram, sector, stage, tags, notes, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params: SqlParam[] = [
      input.name,
      input.company || null,
      JSON.stringify(input.types || []),
      JSON.stringify(input.cities || []),
      input.country || null,
      JSON.stringify(input.emails || []),
      JSON.stringify(input.phones || []),
      input.linkedin || null,
      input.instagram || null,
      input.sector || null,
      input.stage || null,
      JSON.stringify(input.tags || []),
      input.notes || null,
      actor || null,
      actor || null,
    ];

    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      const result = (await connection.query(sql, params)) as { insertId?: number | bigint };
      const insertId = Number(result.insertId);
      if (!insertId) throw new Error('Failed to get insert ID for new contact');
      const created = await this.findById(insertId);
      if (!created) throw new Error('Contact created but could not be reloaded');
      return created;
    } finally {
      connection.release();
    }
  }

  async update(id: number, input: Partial<ContactInput>, actor?: string): Promise<ContactEntity | null> {
    const fields: string[] = [];
    const params: SqlParam[] = [];
    const arrayFields = new Set(['types', 'cities', 'emails', 'phones', 'tags']);

    Object.entries(input).forEach(([key, value]) => {
      if (value === undefined) return;
      if (arrayFields.has(key)) {
        fields.push(`${key} = ?`);
        params.push(JSON.stringify(value || []));
      } else {
        fields.push(`${key} = ?`);
        params.push((value as string) ?? null);
      }
    });
    if (actor) {
      fields.push('updated_by = ?');
      params.push(actor);
    }
    if (!fields.length) return this.findById(id);

    params.push(id);
    await query(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await query('DELETE FROM contacts WHERE id = ?', [id]);
  }

  async bulkDelete(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await query(`DELETE FROM contacts WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  }

  async bulkUpdate(ids: number[], action: BulkAction, value: string | undefined, actor?: string): Promise<void> {
    if (!ids.length) return;
    const placeholders = ids.map(() => '?').join(',');

    if (action === 'delete') {
      await this.bulkDelete(ids);
      return;
    }
    if (action === 'setCity' && value) {
      await query(
        `UPDATE contacts SET cities = ?, updated_by = ? WHERE id IN (${placeholders})`,
        [JSON.stringify([value]), actor || null, ...ids]
      );
      return;
    }
    if (action === 'setCountry' && value) {
      await query(
        `UPDATE contacts SET country = ?, updated_by = ? WHERE id IN (${placeholders})`,
        [value, actor || null, ...ids]
      );
      return;
    }
    if (action === 'addTag' && value) {
      const rows = await query<ContactEntity>(`SELECT id, tags FROM contacts WHERE id IN (${placeholders})`, ids);
      for (const row of rows) {
        // Driver may return the JSON column as an already-parsed array, a raw string, or a Buffer.
        let tags: string[] = [];
        const rawTags: unknown = row.tags;
        if (Array.isArray(rawTags)) tags = rawTags;
        else {
          const text = Buffer.isBuffer(rawTags) ? rawTags.toString('utf8') : typeof rawTags === 'string' ? rawTags : null;
          if (text) {
            try { tags = JSON.parse(text); } catch { tags = []; }
          }
        }
        if (!tags.includes(value)) tags.push(value);
        await query('UPDATE contacts SET tags = ?, updated_by = ? WHERE id = ?', [JSON.stringify(tags), actor || null, row.id]);
      }
    }
  }
}
