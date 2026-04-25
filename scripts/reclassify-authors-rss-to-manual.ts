/**
 * Reclassify RSS-linked posts to Manual for specific author names.
 *
 * Admin "source" is derived from rss_feed_items.post_id:
 * - RSS when rss_feed_items has post_id = posts.id
 * - Manual when no rss_feed_items row links to the post
 *
 * This script unlinks rss_feed_items.post_id (sets to NULL) for posts
 * authored by the provided names.
 *
 * Usage:
 *   npx tsx scripts/reclassify-authors-rss-to-manual.ts --dry-run
 *   npx tsx scripts/reclassify-authors-rss-to-manual.ts --apply
 *   npx tsx scripts/reclassify-authors-rss-to-manual.ts --apply --authors="Team StartupNews.fyi,Sreejit Kumar"
 */
import { loadEnvConfig } from '@next/env';
import { getDbConnection, query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

type CandidateRow = {
  id: number;
  slug: string;
  title: string;
  posted_at: string | null;
  author_name: string | null;
  rss_links: number;
};

function getAuthorsFromArgs(args: string[]): string[] {
  const arg = args.find((a) => a.startsWith('--authors='));
  if (!arg) return ['Team StartupNews.fyi', 'Sreejit Kumar'];
  const raw = arg.split('=')[1] || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getCandidates(authors: string[]): Promise<CandidateRow[]> {
  if (authors.length === 0) return [];
  const placeholders = authors.map(() => '?').join(',');
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
    WHERE u.name IN (${placeholders})
    GROUP BY p.id, p.slug, p.title, posted_at, author_name
    ORDER BY COALESCE(p.published_at, p.created_at) ASC, p.id ASC
    `,
    authors
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');
  const authors = getAuthorsFromArgs(args);

  const candidates = await getCandidates(authors);
  if (candidates.length === 0) {
    console.log(`No RSS-linked posts found for authors: ${authors.join(', ')}`);
    await closeDbConnection();
    return;
  }

  console.log(`Authors: ${authors.join(', ')}`);
  console.log(`Found ${candidates.length} RSS-linked post(s) to reclassify as Manual.`);
  for (const row of candidates.slice(0, 30)) {
    const titlePreview = row.title.length > 90 ? `${row.title.slice(0, 90)}...` : row.title;
    console.log(
      `  id=${row.id} author="${row.author_name}" posted_at=${row.posted_at} rss_links=${row.rss_links} slug=${row.slug} title="${titlePreview}"`
    );
  }
  if (candidates.length > 30) {
    console.log(`  ...and ${candidates.length - 30} more`);
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

