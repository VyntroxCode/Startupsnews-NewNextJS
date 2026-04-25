import { loadEnvConfig } from '@next/env';
import { query } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

// Helper to create slug-friendly string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function migrateSlugsToCategoryFormat() {
  try {
    console.log('Starting slug migration to category/post-slug format...\n');

    // Get all posts with their category slug
    const posts = await query<any>(`
      SELECT p.id, p.slug, c.slug as category_slug, p.slug as post_slug_part
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);

    console.log(`Found ${posts.length} posts to migrate\n`);

    let updated = 0;
    let skipped = 0;

    for (const post of posts) {
      try {
        // Extract just the post slug part (last segment after the last /)
        const currentSlug = post.slug || '';
        const postSlugPart = currentSlug.includes('/')
          ? currentSlug.split('/').pop()
          : currentSlug;

        // Get category slug - default to 'uncategorized' if no category
        const categorySlug = post.category_slug || 'uncategorized';

        // New format: category/post-slug
        const newSlug = `${categorySlug}/${postSlugPart}`;

        // Only update if it's different
        if (newSlug !== currentSlug) {
          await query(
            `UPDATE posts SET slug = ?, updated_at = NOW() WHERE id = ?`,
            [newSlug, post.id]
          );
          updated++;

          if (updated % 1000 === 0) {
            console.log(`Updated ${updated} posts...`);
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`Error updating post ${post.id}:`, error);
      }
    }

    console.log(`\n✅ Slug Migration Complete!`);
    console.log(`\nSummary:`);
    console.log(`  Total posts processed: ${posts.length}`);
    console.log(`  Posts updated: ${updated}`);
    console.log(`  Posts skipped (already in format): ${skipped}`);

    // Show sample of new slugs
    const samples = await query<any>(
      `SELECT id, slug FROM posts ORDER BY id DESC LIMIT 5`
    );
    console.log(`\nSample of new slugs:`);
    samples.forEach((p: any) => {
      console.log(`  - ${p.slug}`);
    });

  } catch (error) {
    console.error('Error during slug migration:', error);
    process.exit(1);
  }
}

migrateSlugsToCategoryFormat().then(() => {
  process.exit(0);
});
