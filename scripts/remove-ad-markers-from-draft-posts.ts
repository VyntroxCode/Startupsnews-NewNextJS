/**
 * Remove ad markers like [ad_1], [ad_2], etc. from draft posts.
 *
 * Run:
 *   npx tsx scripts/remove-ad-markers-from-draft-posts.ts --dry-run
 *   npx tsx scripts/remove-ad-markers-from-draft-posts.ts --apply
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

type DraftPost = {
  id: number;
  content: string | null;
  excerpt: string | null;
};

const BATCH_SIZE = 1000;

function cleanAdMarkers(text: string | null): string | null {
  if (text === null) return null;

  return text
    .replace(/\[\s*ad_\d+\s*\]/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');

  const rows = await query<DraftPost>(`
    SELECT id, content, excerpt
    FROM posts
    WHERE status = 'draft'
      AND (
        LOWER(COALESCE(content, '')) LIKE '%[ad_%'
        OR LOWER(COALESCE(excerpt, '')) LIKE '%[ad_%'
      )
    ORDER BY id ASC
  `);

  if (rows.length === 0) {
    console.log('No draft posts with ad markers found.');
    await closeDbConnection();
    return;
  }

  const updates = rows
    .map((row) => {
      const cleanedContent = cleanAdMarkers(row.content);
      const cleanedExcerpt = cleanAdMarkers(row.excerpt);
      const changed = cleanedContent !== row.content || cleanedExcerpt !== row.excerpt;
      return {
        id: row.id,
        cleanedContent,
        cleanedExcerpt,
        changed,
      };
    })
    .filter((row) => row.changed);

  console.log(`Found ${rows.length} draft post(s) potentially containing ad markers.`);
  console.log(`Will update ${updates.length} draft post(s) after cleanup.`);

  if (dryRun) {
    console.log('\nDry run complete. No changes applied. Use --apply to remove markers.');
    await closeDbConnection();
    return;
  }

  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      await query(
        'UPDATE posts SET content = ?, excerpt = ? WHERE id = ? AND status = \'draft\'',
        [item.cleanedContent, item.cleanedExcerpt, item.id]
      );
      updated += 1;
    }
    console.log(`Updated ${updated}/${updates.length}...`);
  }

  console.log(`\nRemoved ad markers from ${updated} draft post(s).`);
  await closeDbConnection();
}

main().catch(async (error) => {
  console.error(error);
  await closeDbConnection();
  process.exit(1);
});
