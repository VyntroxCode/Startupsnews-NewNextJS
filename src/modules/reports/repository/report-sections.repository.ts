import { query, queryOne } from '@/shared/database/connection';
import type { ReportSectionEntity, ReportSectionInput } from '../domain/section-types';

export class ReportSectionsRepository {
  private migrated = false;

  async ensureTable(): Promise<void> {
    if (this.migrated) return;
    await query(`
      CREATE TABLE IF NOT EXISTS report_sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    this.migrated = true;
  }

  async findAll(): Promise<ReportSectionEntity[]> {
    await this.ensureTable();
    return query<ReportSectionEntity>(
      'SELECT * FROM report_sections ORDER BY sort_order ASC, id ASC'
    );
  }

  async findById(id: number): Promise<ReportSectionEntity | null> {
    await this.ensureTable();
    return queryOne<ReportSectionEntity>(
      'SELECT * FROM report_sections WHERE id = ? LIMIT 1',
      [id]
    );
  }

  async create(input: ReportSectionInput): Promise<ReportSectionEntity> {
    await this.ensureTable();
    await query(
      'INSERT INTO report_sections (title, sort_order) VALUES (?, ?)',
      [input.title.trim(), input.sortOrder ?? 0]
    );
    const created = await queryOne<{ id: number }>('SELECT LAST_INSERT_ID() as id');
    return (await this.findById(created?.id || 0))!;
  }

  async update(id: number, input: ReportSectionInput): Promise<ReportSectionEntity | null> {
    await this.ensureTable();
    await query(
      'UPDATE report_sections SET title = ?, sort_order = ? WHERE id = ?',
      [input.title.trim(), input.sortOrder ?? 0, id]
    );
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await this.ensureTable();
    await query('UPDATE reports SET section_id = NULL WHERE section_id = ?', [id]);
    await query('DELETE FROM report_sections WHERE id = ?', [id]);
  }
}
