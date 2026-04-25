/**
 * Reclassify specific old RSS-linked posts as Manual in admin.
 *
 * Admin source is derived from rss_feed_items.post_id presence:
 * - source = "rss" when rss_feed_items has post_id = posts.id
 * - source = "manual" otherwise
 *
 * This script unlinks rss_feed_items.post_id (sets to NULL) for posts:
 * - posted before 2026-04-06
 * - authored by one of: Team StartupNews.fyi, Sreejit Kumar
 *
 * Run:
 *   npx tsx scripts/reclassify-old-rss-posts-to-manual.ts --dry-run
 *   npx tsx scripts/reclassify-old-rss-posts-to-manual.ts --apply
 */
import { loadEnvConfig } from '@next/env';
import { getDbConnection, query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const CUTOFF_DATE = '2026-04-06';
const TARGET_AUTHORS = ['Team StartupNews.fyi', 'Sreejit Kumar'];

type CandidateRow = {
  id: number;
  slug: string;
  title: string;
  posted_at: string | null;
  author_name: string | null;
  rss_links: number;
};

async function getCandidates(): Promise<CandidateRow[]> {
  const authorPlaceholders = TARGET_AUTHORS.map(() => '?').join(',');
  return query<CandidateRow>(
    `
    SELECT
      p.id,
      p.slug,
      p.title,
      DATE_FORMAT(COALESCE(p.published_at, p.created_at), '%Y-%m-%d %H:%i:%s') AS posted_at,
      u.name AS author_name,
      COUNT(i.id) AS rss_links
    FROM posts p
    INNER JOIN users u ON u.id = p.author_id
    INNER JOIN rss_feed_items i ON i.post_id = p.id
    WHERE COALESCE(p.published_at, p.created_at) < ?
      AND u.name IN (${authorPlaceholders})
    GROUP BY p.id, p.slug, p.title, posted_at, author_name
    ORDER BY COALESCE(p.published_at, p.created_at) ASC, p.id ASC
    `,
    [CUTOFF_DATE, ...TARGET_AUTHORS]
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');

  const candidates = await getCandidates();
  if (candidates.length === 0) {
    console.log('No matching RSS-linked posts found for reclassification.');
    await closeDbConnection();
    return;
  }

  console.log(`Found ${candidates.length} post(s) to reclassify as Manual.`);
  for (const row of candidates.slice(0, 25)) {
    const titlePreview = row.title.length > 90 ? `${row.title.slice(0, 90)}...` : row.title;
    console.log(
      `  id=${row.id} author="${row.author_name}" posted_at=${row.posted_at} rss_links=${row.rss_links} slug=${row.slug} title="${titlePreview}"`
    );
  }
  if (candidates.length > 25) {
    console.log(`  ...and ${candidates.length - 25} more`);
  }

  if (dryRun) {
    console.log('\nDry run complete. No changes applied. Use --apply to execute.');
    await closeDbConnection();
    return;
  }

  const ids = candidates.map((c) => c.id);
  const placeholders = ids.map(() => '?').join(',');
  const pool = await getDbConnection();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const result = await conn.query(
      `UPDATE rss_feed_items
       SET post_id = NULL
       WHERE post_id IN (${placeholders})`,
      ids
    ) as { affectedRows?: number };
    await conn.commit();

    console.log(
      `\nReclassification complete. Unlinked ${result.affectedRows ?? 0} rss_feed_items row(s) for ${ids.length} post(s).`
    );
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
    await closeDbConnection();
  }
}

main().catch(async (error) => {
  console.error('Failed to reclassify posts:', error);
  await closeDbConnection();
  process.exit(1);
});

