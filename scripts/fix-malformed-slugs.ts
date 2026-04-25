import { loadEnvConfig } from '@next/env';
import { getDbConnection, closeDbConnection, query } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

async function fixMalformedSlugs() {
  console.log("🔍 Scanning for posts with malformed slugs...");

  try {
    // Get all posts with malformed slugs (no slash, meaning no category prefix)
    const malformedPosts = await query(`
      SELECT p.id, p.slug, p.category_id, c.slug as category_slug
      FROM posts p
      JOIN categories c ON p.category_id = c.id
      WHERE p.slug NOT LIKE '%/%'
      ORDER BY p.id
    `) as any[];

    console.log(`Found ${malformedPosts.length} posts with malformed slugs.`);

    if (malformedPosts.length === 0) {
      console.log("✓ All slugs are properly formatted!");
      return;
    }

    // Fix each post
    let fixed = 0;
    for (const post of malformedPosts) {
      const newSlug = `${post.category_slug}/${post.slug}`;
      
      await query(
        `UPDATE posts SET slug = ? WHERE id = ?`,
        [newSlug, post.id]
      );

      console.log(`✓ Post ${post.id}: "${post.slug}" → "${newSlug}"`);
      fixed++;
    }

    console.log(`\n✅ Fixed ${fixed} posts with malformed slugs`);

    // Verify the fix
    const stillMalformed = await query(`
      SELECT COUNT(*) as count FROM posts WHERE slug NOT LIKE '%/%'
    `) as any[];

    console.log(`\n✓ Remaining malformed slugs: ${stillMalformed[0].count}`);
    
    const totalPosts = await query(`
      SELECT COUNT(*) as count FROM posts
    `) as any[];

    console.log(`✓ Total posts: ${totalPosts[0].count}`);
    console.log(`✓ Posts with proper category/slug format: ${totalPosts[0].count - stillMalformed[0].count}`);

  } finally {
    await closeDbConnection();
  }
}

fixMalformedSlugs()
  .then(() => {
    console.log("\n✅ Slug fix complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error fixing slugs:", error);
    process.exit(1);
  });
