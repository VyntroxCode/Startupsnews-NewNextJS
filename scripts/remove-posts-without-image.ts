/**
 * Find published posts with no valid featured image and optionally set them to draft.
 * Run: npx tsx scripts/remove-posts-without-image.ts [--dry-run] [--draft]
 *
 * --dry-run   List affected posts only; make no changes (default if no other flag).
 * --draft     Set status to 'draft' for all affected posts (no --dry-run).
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const UNSPLASH_PREFIX = 'https://images.unsplash.com/';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const setDraft = args.includes('--draft');

  const sql = `
    SELECT id, slug, title, status
    FROM posts
    WHERE status = 'published'
      AND (
        featured_image_url IS NULL
        OR TRIM(COALESCE(featured_image_url, '')) = ''
        OR featured_image_url LIKE ?
      )
    ORDER BY id ASC
  `;
  const rows = await query<{ id: number; slug: string; title: string; status: string }>(
    sql,
    [UNSPLASH_PREFIX + '%']
  );

  if (rows.length === 0) {
    console.log('No published posts without a valid featured image.');
    await closeDbConnection();
    return;
  }

  console.log(`Found ${rows.length} published post(s) without valid featured image.`);
  rows.forEach((r) => {
    console.log(`  id=${r.id} slug=${r.slug} title=${r.title.slice(0, 50)}${r.title.length > 50 ? '…' : ''}`);
  });

  if (dryRun || !setDraft) {
    if (!dryRun && !setDraft) {
      console.log('\nUse --draft to set these to draft, or --dry-run to only list.');
    } else {
      console.log('\nDry run: no changes made.');
    }
    await closeDbConnection();
    return;
  }

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const updateSql = `UPDATE posts SET status = 'draft' WHERE id IN (${placeholders})`;
  await query(updateSql, ids);
  console.log(`\nSet ${ids.length} post(s) to draft.`);
  await closeDbConnection();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
