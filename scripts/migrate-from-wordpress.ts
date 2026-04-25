/**
 * Migrate posts (and featured image URLs) from WordPress DB into zox_db.
 *
 * Copies:
 * - Posts: title, slug, excerpt, content, published_at
 * - Featured image: from WP attachment guid (or _wp_attached_file) into featured_image_url / featured_image_small_url
 *
 * Requires:
 * - .env.local with DB_* (zox_db) and WP_DB_* (WordPress DB), or same host with WP_DB_NAME=wp_startupnews
 *
 * Usage: npm run db:migrate-from-wordpress
 */

import mariadb from 'mariadb';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const ZOX = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'zox_db',
};

const WP = {
  host: process.env.WP_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.WP_DB_PORT || process.env.DB_PORT || '3306', 10),
  user: process.env.WP_DB_USER || process.env.DB_USER,
  password: process.env.WP_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.WP_DB_NAME || 'wp_startupnews',
};

const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'wp_';

function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str;
  return str.slice(0, max);
}

async function run() {
  let wpPool: mariadb.Pool | null = null;
  let zoxPool: mariadb.Pool | null = null;

  try {
    wpPool = mariadb.createPool({ ...WP, connectionLimit: 2 });
    zoxPool = mariadb.createPool({ ...ZOX, connectionLimit: 2 });

    console.log('\n📥 WordPress → zox_db migration (posts + image URLs)\n');
    console.log(`   WordPress DB: ${WP.database} @ ${WP.host}`);
    console.log(`   Zox DB:       ${ZOX.database} @ ${ZOX.host}\n`);

    const wpConn = await wpPool.getConnection();
    const zoxConn = await zoxPool.getConnection();

    try {
      // Fetch WP posts with featured image URL (attachment guid)
      const prefix = TABLE_PREFIX;
      const wpPosts = await wpConn.query(
        `SELECT p.ID, p.post_title, p.post_name, p.post_excerpt, p.post_content, p.post_date,
                a.guid AS featured_image_url
         FROM ${prefix}posts p
         LEFT JOIN ${prefix}postmeta pm ON pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id'
         LEFT JOIN ${prefix}posts a ON a.ID = pm.meta_value AND a.post_type = 'attachment'
         WHERE p.post_type = 'post' AND p.post_status IN ('publish', 'draft')
         ORDER BY p.post_date DESC`
      );

      if (!Array.isArray(wpPosts) || wpPosts.length === 0) {
        console.log('   No WordPress posts found.');
        return;
      }

      const categoryIdMap = new Map<string, number>();
      const zoxCategories = (await zoxConn.query(
        'SELECT id, slug, name FROM categories'
      )) as Array<{ id: number; slug: string; name: string }>;
      for (const c of zoxCategories) {
        categoryIdMap.set(c.slug.toLowerCase(), c.id);
        categoryIdMap.set(c.name.toLowerCase(), c.id);
      }

      const adminRows = (await zoxConn.query(
        'SELECT id FROM users WHERE role = ? LIMIT 1',
        ['admin']
      )) as Array<{ id: number }>;
      const authorId = adminRows?.[0]?.id ?? 1;

      let created = 0;
      let skipped = 0;

      for (const row of wpPosts as Array<{
        ID: number;
        post_title: string;
        post_name: string;
        post_excerpt: string;
        post_content: string;
        post_date: Date | string;
        featured_image_url: string | null;
      }>) {
        const slug = truncate((row.post_name || '').trim() || String(row.ID), 500);
        if (!slug) {
          skipped++;
          continue;
        }

        const existing = (await zoxConn.query(
          'SELECT id FROM posts WHERE slug = ?',
          [slug]
        )) as Array<{ id: number }>;
        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        const title = truncate((row.post_title || 'Untitled').trim(), 500);
        const excerpt = (row.post_excerpt || '').trim().slice(0, 2000);
        const content = (row.post_content || '').trim() || '<p></p>';
        const imageUrl = (row.featured_image_url && String(row.featured_image_url).trim()) || null;
        const imageUrlTrunc = imageUrl ? truncate(imageUrl, 500) : null;

        let categoryId = categoryIdMap.get('uncategorized') ?? categoryIdMap.get('Uncategorized');
        if (!categoryId && zoxCategories.length > 0) categoryId = zoxCategories[0].id;
        if (!categoryId) {
          console.log('   ⚠️  No category for zox_db, skipping post:', title);
          skipped++;
          continue;
        }

        const pubDate = row.post_date ? new Date(row.post_date) : null;

        await zoxConn.query(
          `INSERT INTO posts (
            title, slug, excerpt, content, category_id, author_id,
            featured_image_url, featured_image_small_url, format, status, featured,
            published_at, trending_score, view_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            title,
            slug,
            excerpt,
            content,
            categoryId,
            authorId,
            imageUrlTrunc,
            imageUrlTrunc,
            'standard',
            'published',
            0,
            pubDate,
            0,
            0,
          ]
        );
        created++;
        if (created <= 5) {
          console.log(`   ✅ ${title.slice(0, 50)}... ${imageUrlTrunc ? '(with image)' : '(no image)'}`);
        }
      }

      console.log(`\n   ✅ Posts migrated: ${created}`);
      console.log(`   ⏭️  Skipped (already exist or no slug): ${skipped}`);
      console.log('\n   Image links are in featured_image_url / featured_image_small_url.\n');
    } finally {
      wpConn.release();
      zoxConn.release();
    }
  } catch (err: unknown) {
    const cause = err && typeof err === 'object' && 'cause' in err ? (err as { cause?: { sqlMessage?: string } }).cause : null;
    const msg = cause && typeof cause === 'object' && cause?.sqlMessage ? String(cause.sqlMessage) : '';
    if (msg.includes('Access denied') && msg.includes('database')) {
      console.error('\n❌ Migration failed: DB user cannot access the WordPress database.');
      console.error('   Either grant access or set WP_DB_USER / WP_DB_PASSWORD in .env.local.\n');
      console.error('   Grant access (run in MySQL as root):');
      console.error(`   GRANT SELECT ON ${WP.database}.* TO '${WP.user}'@'127.0.0.1';\n`);
    }
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    if (wpPool) await wpPool.end();
    if (zoxPool) await zoxPool.end();
  }
}

run();
