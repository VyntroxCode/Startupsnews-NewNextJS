/**
 * Publish posts that are currently draft and effectively HTTP 404 in admin logic.
 *
 * In this codebase, HTTP status is derived as:
 * - 410 when is_gone_410 is true
 * - 200 when status = 'published'
 * - 404 otherwise
 *
 * So "draft + not gone410" corresponds to posts showing 404.
 *
 * Run:
 *   npx tsx scripts/publish-draft-404-posts.ts --dry-run
 *   npx tsx scripts/publish-draft-404-posts.ts --apply
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

type Row = {
  id: number;
  slug: string;
  title: string;
  status: string;
  is_gone_410: number | null;
};

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');

  const rows = await query<Row>(`
    SELECT id, slug, title, status, is_gone_410
    FROM posts
    WHERE status = 'draft'
      AND COALESCE(is_gone_410, 0) = 0
    ORDER BY id ASC
  `);

  if (rows.length === 0) {
    console.log('No draft posts currently showing HTTP 404 were found.');
    await closeDbConnection();
    return;
  }

  console.log(`Found ${rows.length} draft post(s) that currently show HTTP 404.`);
  rows.slice(0, 10).forEach((r) => {
    console.log(`  id=${r.id} slug=${r.slug} title=${r.title.slice(0, 60)}${r.title.length > 60 ? '...' : ''}`);
  });

  if (dryRun) {
    console.log('\nDry run complete. No changes applied. Use --apply to publish them.');
    await closeDbConnection();
    return;
  }

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  await query(`UPDATE posts SET status = 'published' WHERE id IN (${placeholders})`, ids);

  console.log(`\nPublished ${ids.length} post(s) that were draft+404.`);
  await closeDbConnection();
}

main().catch(async (error) => {
  console.error(error);
  await closeDbConnection();
  process.exit(1);
});
