/**
 * Migrate all posts from "Artificial Intelligence" category (id=44) to "AI & Deeptech" category (id=117)
 *
 * Run:
 *   npx tsx scripts/migrate-artificial-intelligence-posts.ts --dry-run
 *   npx tsx scripts/migrate-artificial-intelligence-posts.ts --apply
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const SOURCE_CATEGORY_ID = 44;  // Artificial Intelligence
const DEST_CATEGORY_ID = 117;   // AI & Deeptech

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');

  // Get source category info
  const sourceCategory = await query<{ id: number; name: string; slug: string }>(
    'SELECT id, name, slug FROM categories WHERE id = ?',
    [SOURCE_CATEGORY_ID]
  );

  // Get destination category info
  const destCategory = await query<{ id: number; name: string; slug: string }>(
    'SELECT id, name, slug FROM categories WHERE id = ?',
    [DEST_CATEGORY_ID]
  );

  if (!sourceCategory[0] || !destCategory[0]) {
    console.error('One or both categories not found');
    await closeDbConnection();
    process.exit(1);
  }

  console.log(`Source: ${sourceCategory[0].name} (id=${sourceCategory[0].id}, slug=${sourceCategory[0].slug})`);
  console.log(`Destination: ${destCategory[0].name} (id=${destCategory[0].id}, slug=${destCategory[0].slug})`);

  // Count posts in source category
  const countResult = await query<{ count: number | bigint }>(
    'SELECT COUNT(*) as count FROM posts WHERE category_id = ?',
    [SOURCE_CATEGORY_ID]
  );

  const postCount = Number(countResult[0]?.count || 0);
  console.log(`\nFound ${postCount} posts to migrate`);

  if (dryRun) {
    console.log('Dry run complete. Use --apply to perform the migration.');
    await closeDbConnection();
    return;
  }

  // Perform migration
  await query(
    'UPDATE posts SET category_id = ? WHERE category_id = ?',
    [DEST_CATEGORY_ID, SOURCE_CATEGORY_ID]
  );

  console.log(`\nMigrated ${postCount} posts from "${sourceCategory[0].name}" to "${destCategory[0].name}"`);

  // Verify
  const verifySource = await query<{ count: number | bigint }>(
    'SELECT COUNT(*) as count FROM posts WHERE category_id = ?',
    [SOURCE_CATEGORY_ID]
  );
  const verifyDest = await query<{ count: number | bigint }>(
    'SELECT COUNT(*) as count FROM posts WHERE category_id = ?',
    [DEST_CATEGORY_ID]
  );

  const remainingSource = Number(verifySource[0]?.count || 0);
  const countDest = Number(verifyDest[0]?.count || 0);

  console.log(`\nVerification:`);
  console.log(`  ${sourceCategory[0].name}: ${remainingSource} posts remaining`);
  console.log(`  ${destCategory[0].name}: ${countDest} posts total`);

  if (remainingSource === 0) {
    console.log('\n✓ Migration successful!');
  } else {
    console.warn('\n⚠ Warning: Some posts may not have been migrated.');
  }

  await closeDbConnection();
}

main().catch(async (error) => {
  console.error(error);
  await closeDbConnection();
  process.exit(1);
});
