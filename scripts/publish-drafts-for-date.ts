/**
 * Publish draft posts for a given calendar day that already satisfy the same
 * body + image rules as the app (non-empty content, featured image not Unsplash, or <img> in body).
 *
 * Usage:
 *   npx tsx scripts/publish-drafts-for-date.ts --dry-run
 *   npx tsx scripts/publish-drafts-for-date.ts --apply
 *   npx tsx scripts/publish-drafts-for-date.ts --apply --date=2026-04-21
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection, getDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

/** Mirrors PostsService.canPublishPost (Unsplash featured URL excluded). */
const PUBLISHABLE_WHERE = `
  p.status = 'draft'
  AND TRIM(COALESCE(p.content, '')) != ''
  AND (
    (
      TRIM(COALESCE(p.featured_image_url, '')) != ''
      AND p.featured_image_url NOT LIKE 'https://images.unsplash.com/%'
    )
    OR p.content LIKE '%<img%'
  )
`;

type Row = { id: number; title: string | null; slug: string };

function getTargetDate(args: string[]): string | null {
  const arg = args.find((a) => a.startsWith('--date='));
  if (arg) return arg.split('=')[1]?.trim() || null;
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');
  const targetDate = getTargetDate(args);

  const dateExpr = targetDate ? 'DATE(?)' : 'CURDATE()';
  const dateParams = targetDate ? [targetDate] : [];

  const listSql = `
    SELECT p.id, p.title, p.slug
    FROM posts p
    WHERE ${PUBLISHABLE_WHERE}
      AND DATE(COALESCE(p.published_at, p.created_at)) = ${dateExpr}
    ORDER BY p.id ASC
  `;

  const candidates = await query<Row>(listSql, dateParams);
  if (candidates.length === 0) {
    console.log(
      JSON.stringify(
        {
          dryRun,
          targetDate: targetDate || '(server CURDATE)',
          matched: 0,
          message: 'No publishable drafts for that date.',
        },
        null,
        2
      )
    );
    await closeDbConnection();
    return;
  }

  console.log(`Publishable drafts (${candidates.length}):`);
  for (const r of candidates.slice(0, 25)) {
    const t = (r.title || '').slice(0, 80);
    console.log(`  id=${r.id} slug=${r.slug} title="${t}${(r.title || '').length > 80 ? '...' : ''}"`);
  }
  if (candidates.length > 25) console.log(`  ... and ${candidates.length - 25} more`);

  if (dryRun) {
    console.log('\nDry run. No changes. Use --apply to publish.');
    await closeDbConnection();
    return;
  }

  const pool = await getDbConnection();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const updateSql = `
      UPDATE posts p
      SET
        p.status = 'published',
        p.published_at = COALESCE(p.published_at, p.created_at, NOW()),
        p.updated_at = NOW()
      WHERE ${PUBLISHABLE_WHERE}
        AND DATE(COALESCE(p.published_at, p.created_at)) = ${dateExpr}
    `;
    const result = (await conn.query(updateSql, dateParams)) as { affectedRows?: number };
    await conn.commit();
    console.log(
      JSON.stringify(
        {
          dryRun: false,
          targetDate: targetDate || '(server CURDATE)',
          published: result.affectedRows ?? candidates.length,
        },
        null,
        2
      )
    );
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
    await closeDbConnection();
  }
}

main().catch(async (err) => {
  console.error(err);
  await closeDbConnection();
  process.exit(1);
});
