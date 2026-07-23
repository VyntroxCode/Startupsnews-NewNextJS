import { queryOne } from '@/shared/database/connection';

/** Resolves the "Press Release" category id. Event Admin's post CRUD is scoped to this category only. */
export async function getPressReleaseCategoryId(): Promise<number | null> {
  const row = await queryOne<{ id: number }>(
    "SELECT id FROM categories WHERE slug = 'press-release' LIMIT 1"
  );
  return row?.id ?? null;
}
