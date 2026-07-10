import { query, queryOne } from '@/shared/database/connection';
import type { BrandStoryEntity, BrandStoryInput } from '../domain/types';

export class BrandStoriesRepository {
  private migrated = false;

  private normalizeBrandStory(story: BrandStoryEntity): BrandStoryEntity {
    return {
      ...story,
      file_size:
        story.file_size == null
          ? null
          : typeof story.file_size === 'bigint'
            ? Number(story.file_size)
            : Number(story.file_size),
      page_count:
        story.page_count == null
          ? null
          : typeof story.page_count === 'bigint'
            ? Number(story.page_count)
            : Number(story.page_count),
      section_id: story.section_id == null ? null : Number(story.section_id),
    };
  }

  private normalizeBrandStories(stories: BrandStoryEntity[]): BrandStoryEntity[] {
    return stories.map((story) => this.normalizeBrandStory(story));
  }

  private async ensureColumn(columnName: string, definition: string): Promise<void> {
    const existing = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'brand_stories'
         AND COLUMN_NAME = ?`,
      [columnName]
    );

    if (!Number(existing?.count || 0)) {
      await query(`ALTER TABLE brand_stories ADD COLUMN ${definition}`);
    }
  }

  private async ensureIndex(indexName: string, definition: string): Promise<void> {
    const existing = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'brand_stories'
         AND INDEX_NAME = ?`,
      [indexName]
    );

    if (!Number(existing?.count || 0)) {
      await query(`ALTER TABLE brand_stories ADD ${definition}`);
    }
  }

  async ensureTable(): Promise<void> {
    if (this.migrated) return;
    await query(`
      CREATE TABLE IF NOT EXISTS brand_stories (
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
        INDEX idx_brand_stories_active_created (is_active, created_at)
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
    await this.ensureColumn('section_id', 'section_id INT NULL DEFAULT NULL');
    await this.ensureColumn('created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
    await this.ensureColumn('updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    await this.ensureColumn('created_by', 'created_by VARCHAR(255) NULL');
    await this.ensureColumn('updated_by', 'updated_by VARCHAR(255) NULL');
    await this.ensureIndex('idx_brand_stories_active_created', 'INDEX idx_brand_stories_active_created (is_active, created_at)');

    this.migrated = true;
  }

  async findAll(): Promise<BrandStoryEntity[]> {
    await this.ensureTable();
    const stories = await query<BrandStoryEntity>('SELECT * FROM brand_stories ORDER BY COALESCE(publish_at, created_at) DESC');
    return this.normalizeBrandStories(stories);
  }

  async findActive(): Promise<BrandStoryEntity[]> {
    await this.ensureTable();
    // When publish_at is NULL, fall back to created_at for ordering
    const stories = await query<BrandStoryEntity>(
      'SELECT *, COALESCE(publish_at, created_at) AS effective_date FROM brand_stories WHERE is_active = 1 ORDER BY COALESCE(publish_at, created_at) DESC'
    );
    return this.normalizeBrandStories(stories);
  }

  async findById(id: number): Promise<BrandStoryEntity | null> {
    await this.ensureTable();
    const story = await queryOne<BrandStoryEntity>('SELECT * FROM brand_stories WHERE id = ? LIMIT 1', [id]);
    return story ? this.normalizeBrandStory(story) : null;
  }

  private toDbDatetime(dt: string): string {
    // datetime-local gives "YYYY-MM-DDTHH:mm" — MariaDB needs "YYYY-MM-DD HH:MM:SS"
    return dt.replace('T', ' ') + (dt.length === 16 ? ':00' : '');
  }

  async create(input: BrandStoryInput): Promise<BrandStoryEntity> {
    await this.ensureTable();
    const rawPublishAt = input.publishAt ? this.toDbDatetime(input.publishAt) : null;
    const isFuture = rawPublishAt ? new Date(rawPublishAt) > new Date() : false;
    const isActive = isFuture ? 0 : (input.isActive === false ? 0 : 1);
    // Always store the user-entered date; only fall back to NOW() when no date given
    await query(
      `INSERT INTO brand_stories (title, description, file_url, thumbnail_url, file_name, file_size, page_count, mime_type, is_active, publish_at, section_id, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?, ?, ?)`,
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
        input.sectionId ?? null,
        input.createdBy || null,
        input.createdBy || null,
      ]
    );

    const created = await queryOne<{ id: number }>('SELECT LAST_INSERT_ID() as id');
    return (await this.findById(created?.id || 0)) as BrandStoryEntity;
  }

  async update(id: number, input: BrandStoryInput): Promise<BrandStoryEntity | null> {
    await this.ensureTable();
    const rawPublishAt = input.publishAt ? this.toDbDatetime(input.publishAt) : null;
    const isFuture = rawPublishAt ? new Date(rawPublishAt) > new Date() : false;
    const isActive = isFuture ? 0 : (input.isActive === false ? 0 : 1);
    // Always store the user-entered date; fall back to created_at only when no date given
    await query(
      `UPDATE brand_stories
       SET title = ?, description = ?, file_url = ?, thumbnail_url = ?, file_name = ?, file_size = ?, page_count = ?, mime_type = ?, is_active = ?,
           publish_at = COALESCE(?, publish_at), section_id = ?, updated_by = ?
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
        input.sectionId ?? null,
        input.updatedBy || null,
        id,
      ]
    );

    return this.findById(id);
  }

  async publishDue(): Promise<number> {
    await this.ensureTable();
    // Keep publish_at value after going live (used for ordering); just flip is_active
    const result = await query<{ affectedRows?: number }>(
      `UPDATE brand_stories SET is_active = 1 WHERE publish_at IS NOT NULL AND publish_at <= NOW() AND is_active = 0`
    );
    return (result as unknown as { affectedRows: number })?.affectedRows ?? 0;
  }

  async delete(id: number): Promise<void> {
    await this.ensureTable();
    await query('DELETE FROM brand_stories WHERE id = ?', [id]);
  }
}
