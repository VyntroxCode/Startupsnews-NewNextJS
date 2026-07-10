import { query, queryOne } from '@/shared/database/connection';
import type { BrandStorySectionEntity, BrandStorySectionInput } from '../domain/section-types';

export class BrandStorySectionsRepository {
  private migrated = false;

  async ensureTable(): Promise<void> {
    if (this.migrated) return;
    await query(`
      CREATE TABLE IF NOT EXISTS brand_story_sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by VARCHAR(255) NULL,
        updated_by VARCHAR(255) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    this.migrated = true;
  }

  async findAll(): Promise<BrandStorySectionEntity[]> {
    await this.ensureTable();
    return query<BrandStorySectionEntity>(
      'SELECT * FROM brand_story_sections ORDER BY sort_order ASC, id ASC'
    );
  }

  async findById(id: number): Promise<BrandStorySectionEntity | null> {
    await this.ensureTable();
    return queryOne<BrandStorySectionEntity>(
      'SELECT * FROM brand_story_sections WHERE id = ? LIMIT 1',
      [id]
    );
  }

  async create(input: BrandStorySectionInput): Promise<BrandStorySectionEntity> {
    await this.ensureTable();
    await query(
      'INSERT INTO brand_story_sections (title, sort_order, created_by, updated_by) VALUES (?, ?, ?, ?)',
      [input.title.trim(), input.sortOrder ?? 0, input.createdBy || null, input.createdBy || null]
    );
    const created = await queryOne<{ id: number }>('SELECT LAST_INSERT_ID() as id');
    return (await this.findById(created?.id || 0))!;
  }

  async update(id: number, input: BrandStorySectionInput): Promise<BrandStorySectionEntity | null> {
    await this.ensureTable();
    await query(
      'UPDATE brand_story_sections SET title = ?, sort_order = ?, updated_by = ? WHERE id = ?',
      [input.title.trim(), input.sortOrder ?? 0, input.updatedBy || null, id]
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.ensureTable();
    await query('UPDATE brand_stories SET section_id = NULL WHERE section_id = ?', [id]);
    await query('DELETE FROM brand_story_sections WHERE id = ?', [id]);
  }
}
