/**
 * One-time migration: add post_id to rss_feed_items and backfill existing rows.
 * Usage: npx tsx scripts/add-rss-post-id-column.ts
 */

import { getDbConnection, closeDbConnection } from '../src/shared/database/connection';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function run() {
  const conn = await getDbConnection();
  const connection = await conn.getConnection();

  try {
    // 1. Add post_id column if missing
    console.log('Adding post_id column if missing...');
    try {
      await connection.query(
        `ALTER TABLE rss_feed_items ADD COLUMN post_id INT NULL AFTER processed`
      );
      console.log('  ✓ post_id column added');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Duplicate column name') || msg.includes('already exists')) {
        console.log('  ✓ post_id column already exists');
      } else {
        throw err;
      }
    }

    // 2. Add FK if missing (ignore if already exists)
    console.log('Adding foreign key if missing...');
    try {
      await connection.query(
        `ALTER TABLE rss_feed_items ADD CONSTRAINT fk_rfi_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL`
      );
      console.log('  ✓ Foreign key added');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Duplicate') || msg.includes('already exists') || msg.includes('errno: 121')) {
        console.log('  ✓ Foreign key already exists');
      } else {
        console.log('  ⚠ FK skipped:', msg);
      }
    }

    // 3. Backfill post_id by matching title (only where exactly one post matches)
    console.log('Backfilling post_id from matching post titles...');
    const result = await connection.query(`
      UPDATE rss_feed_items i
      INNER JOIN (
        SELECT title, MIN(id) AS post_id
        FROM posts
        GROUP BY title
        HAVING COUNT(*) = 1
      ) p ON p.title = i.title
      SET i.post_id = p.post_id, i.processed = 1
      WHERE i.post_id IS NULL
    `) as { affectedRows?: number };
    console.log(`  ✓ Linked ${result.affectedRows ?? 0} rss_feed_items rows to posts`);

    console.log('\nDone.');
  } finally {
    connection.release();
    await closeDbConnection();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
