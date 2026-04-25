import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

async function unpublishShortContent() {
  try {
    console.log('Starting unpublishing process for short-content posts...');

    // Get all posts from March 12 onwards with less than 500 words
    const selectQuery = `
      SELECT id, title, 
        (LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1) as word_count
      FROM posts 
      WHERE status='published' 
        AND DATE(published_at) >= '2026-03-12' 
        AND (LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1) < 500
      ORDER BY id DESC
    `;

    const postsToUnpublish = await query(selectQuery);
    console.log(`Found ${postsToUnpublish.length} posts to unpublish`);

    if (postsToUnpublish.length === 0) {
      console.log('No posts found to unpublish');
      return;
    }

    // Get the IDs
    const ids = postsToUnpublish.map((p: any) => p.id);
    console.log(`Post IDs: ${ids.slice(0, 10).join(', ')}${ids.length > 10 ? '...' : ''}`);

    // Unpublish all at once
    const updateQuery = `
      UPDATE posts 
      SET status='draft', updated_at=NOW()
      WHERE id IN (${ids.join(',')})
    `;

    const result = await query(updateQuery);
    console.log(`✅ Updated ${(result as any).affectedRows ?? postsToUnpublish.length} posts to draft status`);

    // Verify the update
    const verifyQuery = `
      SELECT COUNT(*) as still_published
      FROM posts 
      WHERE status='published' 
        AND DATE(published_at) >= '2026-03-12' 
        AND (LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1) < 500
    `;

    const verify = await query(verifyQuery);
    console.log(`✓ Verification: ${(verify[0] as any).still_published} posts still published with <500 words`);

    // Show word distribution of unpublished
    const statsQuery = `
      SELECT 
        COUNT(*) as count,
        MIN(LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1) as min_words,
        ROUND(AVG(LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1), 0) as avg_words,
        MAX(LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1) as max_words
      FROM posts
      WHERE id IN (${ids.join(',')})
    `;

    const stats = await query(statsQuery);
    console.log('\nUnpublished Posts Statistics:');
    console.log(`  Total: ${(stats[0] as any).count}`);
    console.log(`  Min words: ${(stats[0] as any).min_words}`);
    console.log(`  Avg words: ${(stats[0] as any).avg_words}`);
    console.log(`  Max words: ${(stats[0] as any).max_words}`);

    console.log('\n✅ Unpublishing complete!');

  } catch (error) {
    console.error('Error unpublishing posts:', error);
    process.exit(1);
  } finally {
    await closeDbConnection();
  }
}

unpublishShortContent();
