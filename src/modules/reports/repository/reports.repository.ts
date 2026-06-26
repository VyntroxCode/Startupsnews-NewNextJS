import { query, queryOne } from '@/shared/database/connection';
import type { ReportEntity, ReportInput } from '../domain/types';

export class ReportsRepository {
  private migrated = false;

  private normalizeReport(report: ReportEntity): ReportEntity {
    return {
      ...report,
      file_size:
        report.file_size == null
          ? null
          : typeof report.file_size === 'bigint'
            ? Number(report.file_size)
            : Number(report.file_size),
      page_count:
        report.page_count == null
          ? null
          : typeof report.page_count === 'bigint'
            ? Number(report.page_count)
            : Number(report.page_count),
    };
  }

  private normalizeReports(reports: ReportEntity[]): ReportEntity[] {
    return reports.map((report) => this.normalizeReport(report));
  }

  private async ensureColumn(columnName: string, definition: string): Promise<void> {
    const existing = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'reports'
         AND COLUMN_NAME = ?`,
      [columnName]
    );

    if (!Number(existing?.count || 0)) {
      await query(`ALTER TABLE reports ADD COLUMN ${definition}`);
    }
  }

  private async ensureIndex(indexName: string, definition: string): Promise<void> {
    const existing = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'reports'
         AND INDEX_NAME = ?`,
      [indexName]
    );

    if (!Number(existing?.count || 0)) {
      await query(`ALTER TABLE reports ADD ${definition}`);
    }
  }

  async ensureTable(): Promise<void> {
    if (this.migrated) return;
    await query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT NULL,
        file_name VARCHAR(255) NULL,
        file_size BIGINT NULL,
        page_count INT NULL,
        mime_type VARCHAR(120) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_reports_active_created (is_active, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await this.ensureColumn('title', 'title VARCHAR(255) NOT NULL');
    await this.ensureColumn('description', 'description TEXT NOT NULL');
    await this.ensureColumn('file_url', 'file_url TEXT NOT NULL');
    await this.ensureColumn('thumbnail_url', 'thumbnail_url TEXT NULL');
    await this.ensureColumn('file_name', 'file_name VARCHAR(255) NULL');
    await this.ensureColumn('file_size', 'file_size BIGINT NULL');
    await this.ensureColumn('page_count', 'page_count INT NULL');
    await this.ensureColumn('mime_type', 'mime_type VARCHAR(120) NULL');
    await this.ensureColumn('is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1');
    await this.ensureColumn('publish_at', 'publish_at DATETIME NULL DEFAULT NULL');
    await this.ensureColumn('created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await this.ensureColumn('updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    await this.ensureIndex('idx_reports_active_created', 'INDEX idx_reports_active_created (is_active, created_at)');

    this.migrated = true;
  }

  async findAll(): Promise<ReportEntity[]> {
    await this.ensureTable();
    const reports = await query<ReportEntity>('SELECT * FROM reports ORDER BY COALESCE(publish_at, created_at) DESC');
    return this.normalizeReports(reports);
  }

  async findActive(): Promise<ReportEntity[]> {
    await this.ensureTable();
    // When publish_at is NULL, fall back to created_at for ordering
    const reports = await query<ReportEntity>(
      'SELECT *, COALESCE(publish_at, created_at) AS effective_date FROM reports WHERE is_active = 1 ORDER BY COALESCE(publish_at, created_at) DESC'
    );
    return this.normalizeReports(reports);
  }

  async findById(id: number): Promise<ReportEntity | null> {
    await this.ensureTable();
    const report = await queryOne<ReportEntity>('SELECT * FROM reports WHERE id = ? LIMIT 1', [id]);
    return report ? this.normalizeReport(report) : null;
  }

  private toDbDatetime(dt: string): string {
    // datetime-local gives "YYYY-MM-DDTHH:mm" — MariaDB needs "YYYY-MM-DD HH:MM:SS"
    return dt.replace('T', ' ') + (dt.length === 16 ? ':00' : '');
  }

  async create(input: ReportInput): Promise<ReportEntity> {
    await this.ensureTable();
    const rawPublishAt = input.publishAt ? this.toDbDatetime(input.publishAt) : null;
    const isFuture = rawPublishAt ? new Date(rawPublishAt) > new Date() : false;
    const isActive = isFuture ? 0 : (input.isActive === false ? 0 : 1);
    // Always store the user-entered date; only fall back to NOW() when no date given
    await query(
      `INSERT INTO reports (title, description, file_url, thumbnail_url, file_name, file_size, page_count, mime_type, is_active, publish_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
      [
        input.title,
        input.description,
        input.fileUrl,
        input.thumbnailUrl || null,
        input.fileName || null,
        input.fileSize ?? null,
        input.pageCount ?? null,
        input.mimeType || null,
        isActive,
        rawPublishAt,
      ]
    );

    const created = await queryOne<{ id: number }>('SELECT LAST_INSERT_ID() as id');
    return (await this.findById(created?.id || 0)) as ReportEntity;
  }

  async update(id: number, input: ReportInput): Promise<ReportEntity | null> {
    await this.ensureTable();
    const rawPublishAt = input.publishAt ? this.toDbDatetime(input.publishAt) : null;
    const isFuture = rawPublishAt ? new Date(rawPublishAt) > new Date() : false;
    const isActive = isFuture ? 0 : (input.isActive === false ? 0 : 1);
    // Always store the user-entered date; fall back to created_at only when no date given
    await query(
      `UPDATE reports
       SET title = ?, description = ?, file_url = ?, thumbnail_url = ?, file_name = ?, file_size = ?, page_count = ?, mime_type = ?, is_active = ?,
           publish_at = COALESCE(?, publish_at)
       WHERE id = ?`,
      [
        input.title,
        input.description,
        input.fileUrl,
        input.thumbnailUrl || null,
        input.fileName || null,
        input.fileSize ?? null,
        input.pageCount ?? null,
        input.mimeType || null,
        isActive,
        rawPublishAt,
        id,
      ]
    );

    return this.findById(id);
  }

  async publishDue(): Promise<number> {
    await this.ensureTable();
    // Keep publish_at value after going live (used for ordering); just flip is_active
    const result = await query<{ affectedRows?: number }>(
      `UPDATE reports SET is_active = 1 WHERE publish_at IS NOT NULL AND publish_at <= NOW() AND is_active = 0`
    );
    return (result as unknown as { affectedRows: number })?.affectedRows ?? 0;
  }

  async delete(id: number): Promise<void> {
    await this.ensureTable();
    await query('DELETE FROM reports WHERE id = ?', [id]);
  }
}
