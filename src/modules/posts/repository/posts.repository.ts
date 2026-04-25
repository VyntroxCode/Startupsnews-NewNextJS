import { query, queryOne, getDbConnection } from '@/shared/database/connection';
import { PostEntity } from '../domain/types';

/** Only show published posts that have body (content) and at least one image (featured or <img> in content). */
const HAS_BODY_AND_IMAGE =
  " AND (TRIM(COALESCE(content, '')) != '' AND (TRIM(COALESCE(featured_image_url, '')) != '' OR content LIKE '%<img%'))";

/** InnoDB / MySQL default full-text min token length is often 3; boolean +short* on stopwords yields zero rows. */
const FULLTEXT_BOOLEAN_STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out',
  'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'did',
  'let', 'put', 'say', 'she', 'too', 'use', 'man', 'men', 'own', 'why', 'with', 'from', 'this', 'that', 'they',
  'them', 'than', 'then', 'some', 'such', 'into', 'also', 'only', 'over', 'most', 'more',
]);

export class PostsRepository {
  private metaDescriptionColumnExists: boolean | null = null;

  /** Escape %, _, and \\ for SQL LIKE … ESCAPE '\\'. */
  private escapeLikePattern(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  private normalizeSearchTokens(input: string, maxTokens = 6): string[] {
    return input
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .map((token) => token.replace(/[^a-z0-9-]/g, ''))
      .filter((token) => token.length >= 2)
      .slice(0, maxTokens);
  }

  /** Tokens safe for BOOLEAN MODE (+prefix*) — avoids stopwords and very short tokens that are not indexed. */
  private tokensForBooleanSearch(term: string): string[] {
    return this.normalizeSearchTokens(term, 24)
      .filter((t) => t.length >= 3 && !FULLTEXT_BOOLEAN_STOPWORDS.has(t))
      .slice(0, 20);
  }

  /**
   * Build tokenized search predicate:
   * each token must match at least one searchable column (AND across tokens).
   */
  private buildTokenSearchWhere(tokens: string[], columns: string[]): {
    sql: string;
    params: string[];
  } {
    if (tokens.length === 0) return { sql: '', params: [] };
    const clauses: string[] = [];
    const params: string[] = [];
    for (const token of tokens) {
      const like = `%${token}%`;
      clauses.push(`(${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`);
      for (let i = 0; i < columns.length; i += 1) params.push(like);
    }
    return { sql: ` AND ${clauses.join(' AND ')}`, params };
  }

  /**
   * Lightweight ranking for LIKE fallback paths.
   */
  private buildSearchRankSql(tokens: string[], columns: {
    title: string;
    excerpt: string;
    slug: string;
  }): {
    sql: string;
    params: string[];
  } {
    if (tokens.length === 0) return { sql: '0', params: [] };
    const parts: string[] = [];
    const params: string[] = [];
    for (const token of tokens) {
      const prefix = `${token}%`;
      const contains = `%${token}%`;
      // Title hits are strongest, slug next, excerpt next.
      parts.push(`(CASE WHEN ${columns.title} LIKE ? THEN 30 ELSE 0 END)`);
      params.push(prefix);
      parts.push(`(CASE WHEN ${columns.title} LIKE ? THEN 20 ELSE 0 END)`);
      params.push(contains);
      parts.push(`(CASE WHEN ${columns.slug} LIKE ? THEN 15 ELSE 0 END)`);
      params.push(contains);
      parts.push(`(CASE WHEN ${columns.excerpt} LIKE ? THEN 8 ELSE 0 END)`);
      params.push(contains);
    }
    return { sql: parts.join(' + '), params };
  }

  private async hasMetaDescriptionColumn(): Promise<boolean> {
    if (this.metaDescriptionColumnExists !== null) return this.metaDescriptionColumnExists;
    const row = await queryOne<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'posts'
         AND COLUMN_NAME = 'meta_description'`
    );
    this.metaDescriptionColumnExists = Boolean(row?.cnt);
    return this.metaDescriptionColumnExists;
  }

  /**
   * Find all posts with optional filters
   */
  async findAll(filters?: {
    categoryId?: number;
    categorySlug?: string;
    status?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
    search?: string;
    source?: 'manual' | 'rss';
    /** Sort by latest publish/create date first (admin listing). */
    orderByLatestDate?: boolean;
    /** When false, do not restrict published posts to those with S3 thumbnail (e.g. for admin list) */
    restrictThumbnail?: boolean;
  }): Promise<PostEntity[]> {
    let sql = 'SELECT * FROM posts WHERE 1=1';
    const params: (string | number | boolean | null)[] = [];
    const restrictThumbnail = filters?.restrictThumbnail !== false;

    if (filters?.categoryId) {
      sql += ' AND category_id = ?';
      params.push(filters.categoryId);
    }

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
      if (filters.status === 'published' && restrictThumbnail) sql += HAS_BODY_AND_IMAGE;
    }

    if (filters?.source === 'rss') {
      sql += ' AND id IN (SELECT post_id FROM rss_feed_items WHERE post_id IS NOT NULL)';
    } else if (filters?.source === 'manual') {
      sql += ' AND id NOT IN (SELECT post_id FROM rss_feed_items WHERE post_id IS NOT NULL)';
    }

    if (filters?.featured !== undefined) {
      sql += ' AND featured = ?';
      params.push(filters.featured ? 1 : 0);
    }

    let searchRankSql = '';
    let searchRankParams: string[] = [];
    if (filters?.search) {
      const tokens = this.normalizeSearchTokens(filters.search);
      const fallback = filters.search.trim();
      if (tokens.length > 0) {
        const where = this.buildTokenSearchWhere(tokens, ['title', 'excerpt', 'slug']);
        const rank = this.buildSearchRankSql(tokens, { title: 'title', excerpt: 'excerpt', slug: 'slug' });
        sql += where.sql;
        params.push(...where.params);
        searchRankSql = rank.sql;
        searchRankParams = rank.params;
      } else if (fallback) {
        sql += ' AND (title LIKE ? OR excerpt LIKE ? OR slug LIKE ?)';
        const searchTerm = `%${fallback}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    if (filters?.orderByLatestDate) {
      if (searchRankSql) {
        sql += ` ORDER BY (${searchRankSql}) DESC, COALESCE(published_at, created_at) DESC, id DESC`;
        params.push(...searchRankParams);
      } else {
        sql += ' ORDER BY COALESCE(published_at, created_at) DESC, id DESC';
      }
    } else {
      sql += ' ORDER BY id DESC';
    }

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    return query<PostEntity>(sql, params);
  }

  /**
   * Count posts with optional filters
   */
  async count(filters?: {
    categoryId?: number;
    status?: string;
    featured?: boolean;
    search?: string;
    source?: 'manual' | 'rss';
    restrictThumbnail?: boolean;
  }): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM posts WHERE 1=1';
    const params: (string | number | boolean | null)[] = [];
    const restrictThumbnail = filters?.restrictThumbnail !== false;

    if (filters?.categoryId) {
      sql += ' AND category_id = ?';
      params.push(filters.categoryId);
    }

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
      if (filters.status === 'published' && restrictThumbnail) sql += HAS_BODY_AND_IMAGE;
    }

    if (filters?.source === 'rss') {
      sql += ' AND id IN (SELECT post_id FROM rss_feed_items WHERE post_id IS NOT NULL)';
    } else if (filters?.source === 'manual') {
      sql += ' AND id NOT IN (SELECT post_id FROM rss_feed_items WHERE post_id IS NOT NULL)';
    }

    if (filters?.featured !== undefined) {
      sql += ' AND featured = ?';
      params.push(filters.featured ? 1 : 0);
    }

    if (filters?.search) {
      const tokens = this.normalizeSearchTokens(filters.search);
      const fallback = filters.search.trim();
      if (tokens.length > 0) {
        const where = this.buildTokenSearchWhere(tokens, ['title', 'excerpt', 'slug']);
        sql += where.sql;
        params.push(...where.params);
      } else if (fallback) {
        sql += ' AND (title LIKE ? OR excerpt LIKE ? OR slug LIKE ?)';
        const searchTerm = `%${fallback}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    const result = await queryOne<{ count: number | bigint }>(sql, params);
    // Convert BigInt to Number (MariaDB COUNT() returns BigInt)
    const count = result?.count;
    return count ? Number(count) : 0;
  }

  /**
   * Find post by ID
   */
  async findById(id: number): Promise<PostEntity | null> {
    return queryOne<PostEntity>('SELECT * FROM posts WHERE id = ?', [id]);
  }

  /**
   * Find post by slug
   */
  async findBySlug(slug: string): Promise<PostEntity | null> {
    return queryOne<PostEntity>('SELECT * FROM posts WHERE slug = ?', [slug]);
  }

  /**
   * Get original article URL for a post (from rss_feed_items when post came from RSS).
   */
  async getSourceLinkByPostId(postId: number): Promise<string | null> {
    const row = await queryOne<{ link: string }>(
      'SELECT link FROM rss_feed_items WHERE post_id = ? AND link IS NOT NULL AND link != "" LIMIT 1',
      [postId]
    );
    return row?.link?.trim() ?? null;
  }

  /**
   * Find posts by category slug (with join)
   */
  async findByCategorySlug(categorySlug: string, limit?: number): Promise<PostEntity[]> {
    // Replace ALL occurrences (not just first) to properly prefix columns with table alias
    const filterClause = HAS_BODY_AND_IMAGE
      .replace(/content/g, 'p.content')
      .replace(/featured_image_url/g, 'p.featured_image_url');
    
    let sql = `
      SELECT p.* FROM posts p
      INNER JOIN categories c ON p.category_id = c.id
      WHERE c.slug = ? AND p.status = 'published'${filterClause}
      ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
    `;
    const params: (string | number)[] = [categorySlug];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    return query<PostEntity>(sql, params);
  }

  /**
   * Find featured posts (legacy: by featured flag)
   */
  async findFeatured(limit: number = 5): Promise<PostEntity[]> {
    return query<PostEntity>(
      `SELECT * FROM posts 
       WHERE featured = 1 AND status = 'published'${HAS_BODY_AND_IMAGE}
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Find latest posts from all categories (for "Latest News" / featured section)
   */
  async findLatest(limit: number): Promise<PostEntity[]> {
    return query<PostEntity>(
      `SELECT * FROM posts 
       WHERE status = 'published'${HAS_BODY_AND_IMAGE}
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Find latest published posts without requiring S3 thumbnail (for Latest News listing).
   * entityToPost will still derive image from content when featured_image_url is empty,
   * so onlyPostsWithImage can include posts that have image only in content.
   */
  async findLatestForListing(limit: number): Promise<PostEntity[]> {
    return query<PostEntity>(
      `SELECT * FROM posts 
       WHERE status = 'published'${HAS_BODY_AND_IMAGE}
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC
       LIMIT ?`,
      [limit]
    );
  }

  /**
   * Find latest posts by internal author (users.id).
   */
  async findLatestByAuthorId(authorId: number, limit: number = 20): Promise<PostEntity[]> {
    return query<PostEntity>(
      `SELECT * FROM posts
       WHERE status = 'published'${HAS_BODY_AND_IMAGE}
         AND author_id = ?
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC
       LIMIT ?`,
      [authorId, limit]
    );
  }

  /**
   * Find latest posts by RSS item author name.
   */
  async findLatestByRssAuthor(authorName: string, limit: number = 20): Promise<PostEntity[]> {
    const filterClause = HAS_BODY_AND_IMAGE
      .replace(/content/g, 'p.content')
      .replace(/featured_image_url/g, 'p.featured_image_url');

    return query<PostEntity>(
      `SELECT DISTINCT p.*
       FROM posts p
       INNER JOIN rss_feed_items i ON i.post_id = p.id
       WHERE p.status = 'published'${filterClause}
         AND LOWER(TRIM(COALESCE(i.author, ''))) = LOWER(TRIM(?))
       ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
       LIMIT ?`,
      [authorName, limit]
    );
  }

  /**
   * Find latest posts by RSS source/feed name.
   */
  async findLatestByRssSourceName(sourceName: string, limit: number = 20): Promise<PostEntity[]> {
    const filterClause = HAS_BODY_AND_IMAGE
      .replace(/content/g, 'p.content')
      .replace(/featured_image_url/g, 'p.featured_image_url');

    return query<PostEntity>(
      `SELECT DISTINCT p.*
       FROM posts p
       INNER JOIN rss_feed_items i ON i.post_id = p.id
       INNER JOIN rss_feeds f ON f.id = i.rss_feed_id
       WHERE p.status = 'published'${filterClause}
         AND LOWER(TRIM(COALESCE(f.name, ''))) = LOWER(TRIM(?))
       ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id DESC
       LIMIT ?`,
      [sourceName, limit]
    );
  }

  /**
   * Find latest posts excluding given IDs (for "More News" after featured)
   */
  async findLatestExcluding(limit: number, excludeIds: number[]): Promise<PostEntity[]> {
    if (excludeIds.length === 0) {
      return this.findLatest(limit);
    }
    const placeholders = excludeIds.map(() => '?').join(',');
    return query<PostEntity>(
      `SELECT * FROM posts 
       WHERE status = 'published'${HAS_BODY_AND_IMAGE} AND id NOT IN (${placeholders})
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC
       LIMIT ?`,
      [...excludeIds, limit]
    );
  }

  /**
   * Find latest post slugs excluding given IDs (optimized for performance).
   * Returns only slugs to minimize payload size.
   */
  async findLatestSlugsExcluding(limit: number, excludeIds: number[]): Promise<{ slug: string }[]> {
    if (excludeIds.length === 0) {
      return query<{ slug: string }>(
        `SELECT slug FROM posts 
         WHERE status = 'published'${HAS_BODY_AND_IMAGE}
         ORDER BY COALESCE(published_at, created_at) DESC, id DESC
         LIMIT ?`,
        [limit]
      );
    }
    const placeholders = excludeIds.map(() => '?').join(',');
    return query<{ slug: string }>(
      `SELECT slug FROM posts 
       WHERE status = 'published'${HAS_BODY_AND_IMAGE} AND id NOT IN (${placeholders})
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC
       LIMIT ?`,
      [...excludeIds, limit]
    );
  }

  /**
   * Find previous/next post neighbors by id (newest-first ordering).
   */
  async findPrevNextBySlug(currentSlug: string): Promise<{ prev: PostEntity | null; next: PostEntity | null }> {
    const current = await this.findBySlug(currentSlug);
    if (!current || current.status !== 'published') {
      return { prev: null, next: null };
    }

    const prev = await queryOne<PostEntity>(
      `SELECT * FROM posts WHERE status = 'published'${HAS_BODY_AND_IMAGE} AND id < ? ORDER BY id DESC LIMIT 1`,
      [current.id]
    );
    const next = await queryOne<PostEntity>(
      `SELECT * FROM posts WHERE status = 'published'${HAS_BODY_AND_IMAGE} AND id > ? ORDER BY id ASC LIMIT 1`,
      [current.id]
    );

    return { prev: prev ?? null, next: next ?? null };
  }

  /**
   * Find trending posts
   */
  async findTrending(limit: number = 5, excludeIds: number[] = []): Promise<PostEntity[]> {
    let sql = `
      SELECT * FROM posts 
      WHERE status = 'published'${HAS_BODY_AND_IMAGE}
    `;
    const params: number[] = [];

    if (excludeIds.length > 0) {
      sql += ` AND id NOT IN (${excludeIds.map(() => '?').join(',')})`;
      params.push(...excludeIds);
    }

    sql += ` ORDER BY trending_score DESC, id DESC LIMIT ?`;
    params.push(limit);

    return query<PostEntity>(sql, params);
  }

  /**
   * Search posts: substring on title/slug/excerpt first (full pasted titles), then FULLTEXT
   * (natural language, then boolean with safe tokens), then token AND + LIKE fallback.
   */
  async search(queryText: string, limit: number = 20): Promise<PostEntity[]> {
    const term = queryText.trim();
    const capped = Math.min(Math.max(1, limit), 80);
    if (!term) return [];

    const likeParam = `%${this.escapeLikePattern(term)}%`;

    // 1) Substring match — fixes pasted full titles; BOOLEAN +short* / stopwords often return zero rows.
    const direct = await query<PostEntity>(
      `SELECT * FROM posts
       WHERE status = 'published'${HAS_BODY_AND_IMAGE}
         AND (title LIKE ? ESCAPE '\\\\' OR slug LIKE ? ESCAPE '\\\\' OR excerpt LIKE ? ESCAPE '\\\\')
       ORDER BY
         CASE WHEN title LIKE ? ESCAPE '\\\\' THEN 0 ELSE 1 END,
         COALESCE(published_at, created_at) DESC, id DESC
       LIMIT ?`,
      [likeParam, likeParam, likeParam, likeParam, capped]
    );
    if (direct.length > 0) return direct;

    const tokens = this.normalizeSearchTokens(term, 15);

    // 2) Natural language FULLTEXT — whole phrase, no mandatory per-token AND.
    const nlTerm = term.slice(0, 800);
    if (nlTerm.length >= 2) {
      try {
        const nl = await query<PostEntity>(
          `SELECT * FROM posts
           WHERE status = 'published'${HAS_BODY_AND_IMAGE}
             AND MATCH(title, excerpt, content) AGAINST (? IN NATURAL LANGUAGE MODE)
           ORDER BY MATCH(title, excerpt, content) AGAINST (? IN NATURAL LANGUAGE MODE) DESC,
                    COALESCE(published_at, created_at) DESC, id DESC
           LIMIT ?`,
          [nlTerm, nlTerm, capped]
        );
        if (nl.length > 0) return nl;
      } catch {
        /* index missing */
      }
    }

    const boolTokens = this.tokensForBooleanSearch(term);
    if (boolTokens.length > 0) {
      const booleanQuery = boolTokens.map((t) => `+${t}*`).join(' ');
      try {
        const fulltext = await query<PostEntity>(
          `SELECT * FROM posts
           WHERE status = 'published'${HAS_BODY_AND_IMAGE}
             AND MATCH(title, excerpt, content) AGAINST (? IN BOOLEAN MODE)
           ORDER BY MATCH(title, excerpt, content) AGAINST (? IN BOOLEAN MODE) DESC,
                    COALESCE(published_at, created_at) DESC, id DESC
           LIMIT ?`,
          [booleanQuery, booleanQuery, capped]
        );
        if (fulltext.length > 0) return fulltext;
      } catch {
        /* unsupported boolean query */
      }
    }

    if (tokens.length > 0) {
      const where = this.buildTokenSearchWhere(tokens, ['title', 'excerpt', 'slug']);
      const rank = this.buildSearchRankSql(tokens, { title: 'title', excerpt: 'excerpt', slug: 'slug' });
      const tokenRows = await query<PostEntity>(
        `SELECT * FROM posts
         WHERE status = 'published'${HAS_BODY_AND_IMAGE}
           ${where.sql}
         ORDER BY (${rank.sql}) DESC, COALESCE(published_at, created_at) DESC, id DESC
         LIMIT ?`,
        [...where.params, ...rank.params, capped]
      );
      if (tokenRows.length > 0) return tokenRows;
    }

    // Last resort: body substring (title/excerpt already tried in step 1).
    return query<PostEntity>(
      `SELECT * FROM posts
       WHERE status = 'published'${HAS_BODY_AND_IMAGE}
         AND content LIKE ? ESCAPE '\\\\'
       ORDER BY COALESCE(published_at, created_at) DESC, id DESC
       LIMIT ?`,
      [likeParam, capped]
    );
  }

  /**
   * Create new post
   */
  async create(data: {
    title: string;
    slug: string;
    excerpt: string;
    metaDescription?: string;
    content: string;
    categoryId: number;
    authorId: number;
    featuredImageUrl?: string;
    featuredImageSmallUrl?: string;
    format?: string;
    status?: string;
    featured?: boolean;
  }): Promise<PostEntity> {
    const status = data.status || 'draft';
    const hasMetaDescription = await this.hasMetaDescriptionColumn();
    const sql = hasMetaDescription
      ? `
      INSERT INTO posts (
        title, slug, excerpt, meta_description, content, category_id, author_id,
        featured_image_url, featured_image_small_url, format, status, featured, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      : `
      INSERT INTO posts (
        title, slug, excerpt, content, category_id, author_id,
        featured_image_url, featured_image_small_url, format, status, featured, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = hasMetaDescription
      ? [
        data.title,
        data.slug,
        data.excerpt,
        data.metaDescription || null,
        data.content,
        data.categoryId,
        data.authorId,
        data.featuredImageUrl || null,
        data.featuredImageSmallUrl || null,
        data.format || 'standard',
        status,
        data.featured ? 1 : 0,
        status === 'published' ? new Date() : null,
      ]
      : [
        data.title,
        data.slug,
        data.excerpt,
        data.content,
        data.categoryId,
        data.authorId,
        data.featuredImageUrl || null,
        data.featuredImageSmallUrl || null,
        data.format || 'standard',
        status,
        data.featured ? 1 : 0,
        status === 'published' ? new Date() : null,
      ];

    const conn = await getDbConnection();
    const connection = await conn.getConnection();
    try {
      const result = await connection.query(sql, params) as { insertId?: number };
      const insertId = result.insertId;
      if (!insertId) {
        throw new Error('Failed to get insert ID');
      }
      return this.findById(insertId) as Promise<PostEntity>;
    } finally {
      connection.release();
    }
  }

  /**
   * Update post
   */
  async update(id: number, data: Partial<PostEntity>): Promise<PostEntity> {
    const hasMetaDescription = await this.hasMetaDescriptionColumn();
    if (!hasMetaDescription && Object.prototype.hasOwnProperty.call(data, 'meta_description')) {
      delete (data as Partial<PostEntity>).meta_description;
    }

    const fields: string[] = [];
    const params: (string | number | boolean | Date | null)[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        fields.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (fields.length === 0) {
      return this.findById(id) as Promise<PostEntity>;
    }

    params.push(id);
    await query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id) as Promise<PostEntity>;
  }

  /**
   * Delete post
   */
  async delete(id: number): Promise<void> {
    await query('DELETE FROM posts WHERE id = ?', [id]);
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: number): Promise<void> {
    await query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [id]);
  }
}

