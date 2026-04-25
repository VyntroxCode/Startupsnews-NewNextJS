/**
 * Fill missing/blank excerpts for draft posts while keeping them as draft.
 *
 * Run:
 *   npx tsx scripts/fill-draft-post-excerpts.ts --dry-run
 *   npx tsx scripts/fill-draft-post-excerpts.ts --apply
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

type DraftPost = {
  id: number;
  title: string;
  content: string | null;
  excerpt: string | null;
};

const MAX_EXCERPT_LENGTH = 220;
const BATCH_SIZE = 1000;

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function toExcerpt(content: string | null, title: string): string {
  const text = stripHtml(content || '').trim();
  const base = text.length > 0 ? text : title.trim();
  if (base.length <= MAX_EXCERPT_LENGTH) {
    return base;
  }

  const cutoff = base.lastIndexOf(' ', MAX_EXCERPT_LENGTH);
  const safeEnd = cutoff > 120 ? cutoff : MAX_EXCERPT_LENGTH;
  return `${base.slice(0, safeEnd).trim()}...`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');

  const rows = await query<DraftPost>(`
    SELECT id, title, content, excerpt
    FROM posts
    WHERE status = 'draft'
      AND TRIM(COALESCE(excerpt, '')) = ''
    ORDER BY id ASC
  `);

  if (rows.length === 0) {
    console.log('No draft posts with missing/blank excerpt found.');
    await closeDbConnection();
    return;
  }

  const updates = rows.map((row) => ({
    id: row.id,
    excerpt: toExcerpt(row.content, row.title),
  }));

  console.log(`Found ${rows.length} draft post(s) with missing/blank excerpt.`);
  console.log('Sample excerpts (first 5):');
  updates.slice(0, 5).forEach((u) => {
    console.log(`  id=${u.id} excerpt=${u.excerpt.slice(0, 100)}${u.excerpt.length > 100 ? '...' : ''}`);
  });

  if (dryRun) {
    console.log('\nDry run complete. No changes applied. Use --apply to update excerpts.');
    await closeDbConnection();
    return;
  }

  let updated = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      await query('UPDATE posts SET excerpt = ? WHERE id = ? AND status = \'draft\'', [item.excerpt, item.id]);
      updated += 1;
    }
    console.log(`Updated ${updated}/${updates.length}...`);
  }

  console.log(`\nFilled excerpt for ${updated} draft post(s). Status remained draft.`);
  await closeDbConnection();
}

main().catch(async (error) => {
  console.error(error);
  await closeDbConnection();
  process.exit(1);
});
