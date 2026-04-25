import { loadEnvConfig } from '@next/env';
import { closeDbConnection, query, queryOne } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

type CategoryRow = { id: number };

async function getCategoryIdBySlug(slug: string): Promise<number | null> {
  const row = await queryOne<CategoryRow>('SELECT id FROM categories WHERE slug = ? LIMIT 1', [slug]);
  return row?.id ?? null;
}

async function main() {
  const existingId = await getCategoryIdBySlug('gaming');
  if (existingId) {
    console.log(`Gaming category already exists (id=${existingId}).`);
    return;
  }

  const maxSort = await queryOne<{ maxSort: number | null }>('SELECT MAX(sort_order) AS maxSort FROM categories');
  const nextSortOrder = (maxSort?.maxSort ?? 0) + 1;

  await query(
    `INSERT INTO categories (name, slug, description, image_url, parent_id, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    ['Gaming', 'gaming', 'Gaming and esports news', null, null, nextSortOrder]
  );

  const createdId = await getCategoryIdBySlug('gaming');
  console.log(`Gaming category created (id=${createdId ?? 'unknown'}).`);
}

main()
  .catch((error) => {
    console.error('Failed to ensure gaming category:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDbConnection().catch(() => {});
  });

