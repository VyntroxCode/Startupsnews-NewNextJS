import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { PartnerLogoEntity, PartnerLogoInput, InnerPageContentEntity } from '../domain/types';

export class PartnerLogosRepository {
  async findAll(): Promise<PartnerLogoEntity[]> {
    return query<PartnerLogoEntity>('SELECT * FROM partner_logos ORDER BY section, sort_order, id');
  }

  async findById(id: number): Promise<PartnerLogoEntity | null> {
    return queryOne<PartnerLogoEntity>('SELECT * FROM partner_logos WHERE id = ?', [id]);
  }

  /** New logos append to the end of their section (max sort_order + 1) — admins add one at a
   * time via the form, there's no batch-reorder UI, so "just added" always means "last". */
  async create(input: PartnerLogoInput, actor?: string): Promise<PartnerLogoEntity> {
    const maxRow = await queryOne<{ maxOrder: number | null }>(
      'SELECT MAX(sort_order) as maxOrder FROM partner_logos WHERE section = ?',
      [input.section]
    );
    const nextOrder = (maxRow?.maxOrder ?? -1) + 1;
    // The shared query() helper always normalizes its result into a T[] (it wraps a bare INSERT
    // OkPacket as [okPacket]), so it can't be cast straight to { insertId } — go through a raw
    // connection instead, same pattern every other repository's create() uses.
    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      const result = (await connection.query(
        'INSERT INTO partner_logos (section, image_url, link_url, sort_order, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)',
        [input.section, input.imageUrl, input.linkUrl?.trim() || null, nextOrder, actor || null, actor || null]
      )) as { insertId?: number | bigint };
      const insertId = Number(result.insertId);
      if (!insertId) throw new Error('Failed to get insert ID for new partner logo');
      const created = await this.findById(insertId);
      if (!created) throw new Error('Partner logo created but could not be reloaded');
      return created;
    } finally {
      connection.release();
    }
  }

  async update(id: number, input: Partial<PartnerLogoInput>, actor?: string): Promise<PartnerLogoEntity | null> {
    const fields: string[] = [];
    const params: (string | null)[] = [];
    if (input.section !== undefined) { fields.push('section = ?'); params.push(input.section); }
    if (input.imageUrl !== undefined) { fields.push('image_url = ?'); params.push(input.imageUrl); }
    if (input.linkUrl !== undefined) { fields.push('link_url = ?'); params.push(input.linkUrl?.trim() || null); }
    if (actor) { fields.push('updated_by = ?'); params.push(actor); }
    if (!fields.length) return this.findById(id);
    params.push(String(id));
    await query(`UPDATE partner_logos SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await query('DELETE FROM partner_logos WHERE id = ?', [id]);
  }
}

export class InnerPageContentRepository {
  async find(pageKey: string): Promise<InnerPageContentEntity | null> {
    return queryOne<InnerPageContentEntity>('SELECT * FROM inner_page_content WHERE page_key = ?', [pageKey]);
  }

  async upsert(pageKey: string, contentHtml: string, actor?: string): Promise<InnerPageContentEntity> {
    await query(
      `INSERT INTO inner_page_content (page_key, content_html, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE content_html = VALUES(content_html), updated_by = VALUES(updated_by)`,
      [pageKey, contentHtml, actor || null]
    );
    const row = await this.find(pageKey);
    if (!row) throw new Error('Inner page content saved but could not be reloaded');
    return row;
  }
}
