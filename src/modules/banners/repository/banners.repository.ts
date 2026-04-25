import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { BannerEntity } from '../domain/types';

export class BannersRepository {
  async findAll(filters?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
    filterByDate?: boolean; // Only filter by date for frontend display
  }): Promise<BannerEntity[]> {
    let sql = 'SELECT * FROM banners WHERE 1=1';
    const params: (string | number | boolean)[] = [];

    if (filters?.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(filters.isActive);
    }

    // Filter by date range only if explicitly requested (for frontend display).
    // Keep upcoming active banners visible by enforcing only end_date here.
    if (filters?.filterByDate === true) {
      sql += ' AND (end_date IS NULL OR end_date >= NOW())';
    }

    sql += ' ORDER BY display_order ASC, created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return query<BannerEntity>(sql, params);
  }

  /**
   * Count banners with optional filters
   */
  async count(filters?: {
    isActive?: boolean;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM banners WHERE 1=1';
    const params: (string | number | boolean)[] = [];

    if (filters?.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(filters.isActive);
    }

    const result = await queryOne<{ count: number | bigint }>(sql, params);
    const count = result?.count;
    return count ? Number(count) : 0;
  }

  async findById(id: number): Promise<BannerEntity | null> {
    return queryOne<BannerEntity>('SELECT * FROM banners WHERE id = ?', [id]);
  }

  /**
   * Create new banner
   */
  async create(data: {
    title: string;
    description?: string;
    imageUrl: string;
    linkUrl?: string;
    linkText?: string;
    order: number;
    isActive: boolean;
    startDate?: Date | string;
    endDate?: Date | string;
  }): Promise<BannerEntity> {
    const sql = `
      INSERT INTO banners (
        title, description, image_url, link_url, link_text,
        display_order, is_active, start_date, end_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [
      data.title,
      data.description || null,
      data.imageUrl,
      data.linkUrl || null,
      data.linkText || null,
      data.order,
      data.isActive ? 1 : 0,
      data.startDate || null,
      data.endDate || null,
    ];

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(sql, params) as { insertId?: number };
      const insertId = result.insertId;
      if (!insertId) {
        throw new Error('Failed to get insert ID');
      }
      return this.findById(insertId) as Promise<BannerEntity>;
    } finally {
      connection.release();
    }
  }

  /**
   * Update banner
   */
  async update(id: number, data: Partial<{
    title: string;
    description: string;
    imageUrl: string;
    linkUrl: string;
    linkText: string;
    order: number;
    isActive: boolean;
    startDate: Date | string;
    endDate: Date | string;
  }>): Promise<BannerEntity> {
    const updates: string[] = [];
    const params: (string | number | boolean | Date | null)[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description || null);
    }
    if (data.imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(data.imageUrl);
    }
    if (data.linkUrl !== undefined) {
      updates.push('link_url = ?');
      params.push(data.linkUrl || null);
    }
    if (data.linkText !== undefined) {
      updates.push('link_text = ?');
      params.push(data.linkText || null);
    }
    if (data.order !== undefined) {
      updates.push('display_order = ?');
      params.push(data.order);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.startDate !== undefined) {
      updates.push('start_date = ?');
      params.push(data.startDate || null);
    }
    if (data.endDate !== undefined) {
      updates.push('end_date = ?');
      params.push(data.endDate || null);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Banner not found');
      }
      return existing;
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const sql = `UPDATE banners SET ${updates.join(', ')} WHERE id = ?`;
    await query(sql, params);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to retrieve updated banner');
    }

    return updated;
  }

  /**
   * Delete banner
   */
  async delete(id: number): Promise<boolean> {
    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query('DELETE FROM banners WHERE id = ?', [id]) as { affectedRows?: number };
      return (result?.affectedRows || 0) > 0;
    } finally {
      connection.release();
    }
  }
}

