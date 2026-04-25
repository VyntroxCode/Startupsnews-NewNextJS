import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import type { RssFeedEntity, RssFeedItemEntity } from '../domain/types';

export class RssFeedsRepository {
  async findEnabled(): Promise<RssFeedEntity[]> {
    return query<RssFeedEntity>('SELECT * FROM rss_feeds WHERE enabled = 1 ORDER BY id');
  }

  /** Enabled feeds that are due for fetch (last_fetched_at is null or interval elapsed). */
  async findEnabledDue(): Promise<RssFeedEntity[]> {
    return query<RssFeedEntity>(`
      SELECT * FROM rss_feeds
      WHERE enabled = 1
        AND (
          last_fetched_at IS NULL
          OR TIMESTAMPDIFF(MINUTE, last_fetched_at, NOW()) >= fetch_interval_minutes
        )
      ORDER BY id
    `);
  }

  async findAll(): Promise<RssFeedEntity[]> {
    return query<RssFeedEntity>('SELECT * FROM rss_feeds ORDER BY id');
  }

  async findById(id: number): Promise<RssFeedEntity | null> {
    return queryOne<RssFeedEntity>('SELECT * FROM rss_feeds WHERE id = ?', [id]);
  }

  async create(data: {
    name: string;
    url: string;
    category_id: number;
    author_id: number;
    enabled?: number;
    fetch_interval_minutes?: number;
    max_items_per_fetch?: number;
    auto_publish?: number;
  }): Promise<RssFeedEntity> {
    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const sql = `
        INSERT INTO rss_feeds (name, url, category_id, author_id, enabled, fetch_interval_minutes, max_items_per_fetch, auto_publish)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.name,
        data.url,
        data.category_id,
        data.author_id,
        data.enabled ?? 1,
        data.fetch_interval_minutes ?? 10,
        data.max_items_per_fetch ?? 10,
        data.auto_publish ?? 1,
      ];
      const result = await connection.query(sql, params) as { insertId?: number };
      const id = result.insertId;
      if (!id) throw new Error('Failed to get rss_feeds insert ID');
      const row = await queryOne<RssFeedEntity>('SELECT * FROM rss_feeds WHERE id = ?', [id]);
      if (!row) throw new Error('Failed to load created rss_feed');
      return row;
    } finally {
      connection.release();
    }
  }

  async update(id: number, data: Partial<{
    name: string;
    url: string;
    logo_url: string | null;
    category_id: number;
    author_id: number;
    enabled: number;
    fetch_interval_minutes: number;
    max_items_per_fetch: number;
    auto_publish: number;
  }>): Promise<RssFeedEntity | null> {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
    if (data.logo_url !== undefined) { fields.push('logo_url = ?'); values.push(data.logo_url); }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
    if (data.author_id !== undefined) { fields.push('author_id = ?'); values.push(data.author_id); }
    if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled); }
    if (data.fetch_interval_minutes !== undefined) { fields.push('fetch_interval_minutes = ?'); values.push(data.fetch_interval_minutes); }
    if (data.max_items_per_fetch !== undefined) { fields.push('max_items_per_fetch = ?'); values.push(data.max_items_per_fetch); }
    if (data.auto_publish !== undefined) { fields.push('auto_publish = ?'); values.push(data.auto_publish); }
    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await query(`UPDATE rss_feeds SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    await query('DELETE FROM rss_feeds WHERE id = ?', [id]);
  }

  async itemExistsByGuid(feedId: number, guid: string): Promise<boolean> {
    const row = await queryOne<{ id: number }>(
      'SELECT id FROM rss_feed_items WHERE rss_feed_id = ? AND guid = ? LIMIT 1',
      [feedId, guid]
    );
    return !!row;
  }

  async saveFeedItem(data: {
    rss_feed_id: number;
    guid: string;
    title: string;
    link: string;
    author?: string | null;
    description?: string | null;
    content?: string | null;
    image_url?: string | null;
    published_at?: Date | string | null;
  }): Promise<RssFeedItemEntity> {
    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const sql = `
        INSERT INTO rss_feed_items (
          rss_feed_id, guid, title, link, author, description, content, image_url, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        data.rss_feed_id,
        data.guid,
        data.title.substring(0, 500),
        data.link.substring(0, 1000),
        data.author ? data.author.substring(0, 500) : null,
        data.description ?? null,
        data.content ?? null,
        data.image_url ?? null,
        data.published_at ?? null,
      ];
      const result = await connection.query(sql, params) as { insertId?: number };
      const insertId = result.insertId;
      if (!insertId) throw new Error('Failed to get rss_feed_items insert ID');
      const row = await queryOne<RssFeedItemEntity>('SELECT * FROM rss_feed_items WHERE id = ?', [insertId]);
      if (!row) throw new Error('Failed to load saved rss_feed_item');
      return row;
    } finally {
      connection.release();
    }
  }

  async linkItemToPost(itemId: number, postId: number): Promise<void> {
    await query(
      'UPDATE rss_feed_items SET processed = 1, post_id = ? WHERE id = ?',
      [postId, itemId]
    );
  }

  /** Get source attribution for a post that came from RSS (feed name, logo, item author). */
  async getRssSourceByPostId(postId: number): Promise<{ sourceName: string; sourceLogoUrl: string | null; sourceAuthor: string | null } | null> {
    const row = await queryOne<{ name: string; logo_url: string | null; author: string | null }>(
      `SELECT f.name, f.logo_url, i.author
       FROM rss_feed_items i
       INNER JOIN rss_feeds f ON f.id = i.rss_feed_id
       WHERE i.post_id = ?
       LIMIT 1`,
      [postId]
    );
    if (!row) return null;
    return {
      sourceName: row.name,
      sourceLogoUrl: row.logo_url ?? null,
      sourceAuthor: row.author ?? null,
    };
  }

  async updateLastFetched(feedId: number, error: string | null = null): Promise<void> {
    if (error !== null) {
      await query(
        'UPDATE rss_feeds SET last_fetched_at = NOW(), last_error = ?, error_count = error_count + 1 WHERE id = ?',
        [error.substring(0, 2000), feedId]
      );
    } else {
      await query(
        'UPDATE rss_feeds SET last_fetched_at = NOW(), last_error = NULL, error_count = 0 WHERE id = ?',
        [feedId]
      );
    }
  }
}
