import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { CategoryEntity } from '../domain/types';

export class CategoriesRepository {
  /**
   * Find all categories
   */
  async findAll(filters?: {
    parentId?: number | null;
    includeChildren?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<CategoryEntity[]> {
    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params: (number | null | string)[] = [];

    if (filters?.parentId !== undefined) {
      if (filters.parentId === null) {
        sql += ' AND parent_id IS NULL';
      } else {
        sql += ' AND parent_id = ?';
        params.push(filters.parentId);
      }
    }

    if (filters?.search) {
      sql += ' AND (name LIKE ? OR slug LIKE ? OR description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY sort_order ASC, name ASC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return query<CategoryEntity>(sql, params);
  }

  /**
   * Count categories with optional filters
   */
  async count(filters?: {
    parentId?: number | null;
    search?: string;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM categories WHERE 1=1';
    const params: (number | null | string)[] = [];

    if (filters?.parentId !== undefined) {
      if (filters.parentId === null) {
        sql += ' AND parent_id IS NULL';
      } else {
        sql += ' AND parent_id = ?';
        params.push(filters.parentId);
      }
    }

    if (filters?.search) {
      sql += ' AND (name LIKE ? OR slug LIKE ? OR description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const result = await queryOne<{ count: number | bigint }>(sql, params);
    // Convert BigInt to Number (MariaDB COUNT() returns BigInt)
    const count = result?.count;
    return count ? Number(count) : 0;
  }

  /**
   * Find category by ID
   */
  async findById(id: number): Promise<CategoryEntity | null> {
    return queryOne<CategoryEntity>('SELECT * FROM categories WHERE id = ?', [id]);
  }

  /**
   * Find category by slug
   */
  async findBySlug(slug: string): Promise<CategoryEntity | null> {
    return queryOne<CategoryEntity>('SELECT * FROM categories WHERE slug = ?', [slug]);
  }

  /**
   * Find categories by parent ID
   */
  async findByParentId(parentId: number): Promise<CategoryEntity[]> {
    return query<CategoryEntity>(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order ASC, name ASC',
      [parentId]
    );
  }

  /**
   * Find root categories (no parent)
   */
  async findRootCategories(): Promise<CategoryEntity[]> {
    return query<CategoryEntity>(
      'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC, name ASC'
    );
  }

  /**
   * Create new category
   */
  async create(data: {
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    parentId?: number;
    sortOrder?: number;
  }): Promise<CategoryEntity> {
    const sql = `
      INSERT INTO categories (
        name, slug, description, image_url, parent_id, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.name,
      data.slug,
      data.description || null,
      data.imageUrl || null,
      data.parentId || null,
      data.sortOrder || 0,
    ];

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(sql, params) as { insertId?: number };
      const insertId = result.insertId;
      if (!insertId) {
        throw new Error('Failed to get insert ID');
      }
      return this.findById(insertId) as Promise<CategoryEntity>;
    } finally {
      connection.release();
    }
  }

  /**
   * Update category
   */
  async update(id: number, data: Partial<CategoryEntity>): Promise<CategoryEntity> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        // Keep already snake_case keys as-is; convert only camelCase keys.
        const dbKey = key.includes('_') ? key : key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        params.push(value as string | number | null);
      }
    });

    if (fields.length === 0) {
      return this.findById(id) as Promise<CategoryEntity>;
    }

    params.push(id);
    await query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id) as Promise<CategoryEntity>;
  }

  /**
   * Delete category
   */
  async delete(id: number): Promise<void> {
    await query('DELETE FROM categories WHERE id = ?', [id]);
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as count FROM categories WHERE slug = ?';
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

