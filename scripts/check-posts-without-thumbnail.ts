/**
 * List published posts that have no thumbnail (won't appear on public site).
 * Run: npx tsx scripts/check-posts-without-thumbnail.ts
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const UNSPLASH_PREFIX = 'https://images.unsplash.com/';

async function main() {
  // Same condition as "no thumbnail" in repository (inverse of HAS_THUMBNAIL): exclude Unsplash URLs
  const sql = `
    SELECT id, slug, title, status,
           COALESCE(featured_image_url, '') AS featured_image_url
    FROM posts
    WHERE status = 'published'
      AND (
        featured_image_url IS NULL
        OR TRIM(COALESCE(featured_image_url, '')) = ''
        OR featured_image_url LIKE ?
      )
    ORDER BY id DESC
    LIMIT 500
  `;
  const rows = await query<{ id: number; slug: string; title: string; status: string; featured_image_url: string }>(
    sql,
    [UNSPLASH_PREFIX + '%']
  );

  const countSql = `
    SELECT COUNT(*) AS cnt FROM posts
    WHERE status = 'published'
      AND (
        featured_image_url IS NULL
        OR TRIM(COALESCE(featured_image_url, '')) = ''
        OR featured_image_url LIKE ?
      )
  `;
  const countResult = await query<{ cnt: number | bigint }>(countSql, [UNSPLASH_PREFIX + '%']);
  const total = Number(countResult[0]?.cnt ?? 0);

  console.log('Published posts WITHOUT thumbnail / with Unsplash URL (hidden from website):', total);
  if (rows.length > 0) {
    console.log('Sample (up to 500):');
    rows.forEach((r) => {
      const img =
        !r.featured_image_url || r.featured_image_url.trim() === ''
          ? '(empty)'
          : r.featured_image_url.startsWith(UNSPLASH_PREFIX)
            ? '(Unsplash URL)'
            : r.featured_image_url.slice(0, 50) + '…';
      console.log(`  id=${r.id} slug=${r.slug} title=${r.title.slice(0, 45)}… img=${img}`);
    });
  }
  await closeDbConnection();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
