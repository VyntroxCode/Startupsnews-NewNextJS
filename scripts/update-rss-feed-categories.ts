#!/usr/bin/env tsx
/**
 * Map all RSS feeds to categories using shared mapping.
 * Uses ALL categories from DB (no category left out of dropdown/mapping).
 * Usage: npx tsx scripts/update-rss-feed-categories.ts [--dry-run]
 */

import { loadEnvConfig } from '@next/env';
import { resolve } from 'path';
loadEnvConfig(resolve(process.cwd(), '.env.local'));

import mariadb from 'mariadb';
import { mapFeedToCategorySlug, DEFAULT_CATEGORY_SLUG } from '../src/modules/rss-feeds/utils/feed-category-mapping';

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'zox_user',
  password: process.env.DB_PASSWORD || 'zox_password',
  database: process.env.DB_NAME || 'zox_db',
};

interface RssFeed {
  id: number;
  name: string;
  url: string;
  category_id: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  let pool: mariadb.Pool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = mariadb.createPool({ ...DB, connectionLimit: 2 });
    const conn = await pool.getConnection();

    // Get ALL categories (no category left out)
    console.log('📊 Fetching all categories...');
    const categories = await conn.query<Category[]>(
      'SELECT id, name, slug FROM categories ORDER BY sort_order ASC, name ASC'
    );
    const categoryBySlug: Record<string, Category> = {};
    categories.forEach((c) => { categoryBySlug[c.slug] = c; });

    console.log(`✅ Found ${categories.length} categories`);
    if (categories.length === 0) {
      console.error('❌ No categories in database. Create categories first.');
      process.exit(1);
    }

    const firstCategoryId = categories[0].id;
    const fallbackSlug = categoryBySlug[DEFAULT_CATEGORY_SLUG] ? DEFAULT_CATEGORY_SLUG : categories[0].slug;

    // Get all RSS feeds
    console.log('📰 Fetching RSS feeds...');
    const feeds = await conn.query<RssFeed[]>(
      'SELECT id, name, url, category_id FROM rss_feeds ORDER BY id'
    );
    console.log(`✅ Found ${feeds.length} RSS feeds\n`);

    console.log('='.repeat(80));
    console.log('RSS FEED → CATEGORY MAPPING');
    console.log('='.repeat(80));

    const updates: Array<{
      feedId: number;
      feedName: string;
      oldCategoryId: number;
      newCategoryId: number;
      categorySlug: string;
      categoryName: string;
    }> = [];

    for (const feed of feeds) {
      const slug = mapFeedToCategorySlug(feed.name, feed.url);
      const category = categoryBySlug[slug] ?? categoryBySlug[fallbackSlug] ?? categories[0];
      const newCategoryId = category.id;
      if (feed.category_id !== newCategoryId) {
        updates.push({
          feedId: feed.id,
          feedName: feed.name,
          oldCategoryId: feed.category_id,
          newCategoryId,
          categorySlug: category.slug,
          categoryName: category.name,
        });
      }
    }

    // Summary by category (current + after update)
    const countBySlug: Record<string, number> = {};
    categories.forEach((c) => { countBySlug[c.slug] = 0; });
    feeds.forEach((f) => {
      const slug = mapFeedToCategorySlug(f.name, f.url);
      const cat = categoryBySlug[slug] ?? categoryBySlug[fallbackSlug] ?? categories[0];
      countBySlug[cat.slug] = (countBySlug[cat.slug] ?? 0) + 1;
    });

    console.log('\n📂 Feeds per category (after mapping):');
    categories.forEach((c) => {
      const n = countBySlug[c.slug] ?? 0;
      console.log(`   ${c.name} (${c.slug}): ${n} feed(s)`);
    });

    if (updates.length > 0) {
      console.log(`\n📝 Feeds to update: ${updates.length}`);
      updates.slice(0, 15).forEach((u) => {
        console.log(`   [${u.feedId}] ${u.feedName} → ${u.categoryName}`);
      });
      if (updates.length > 15) console.log(`   ... and ${updates.length - 15} more`);
    } else {
      console.log('\n✅ All feeds already mapped to the correct category.');
    }

    const emptyCategories = categories.filter((c) => (countBySlug[c.slug] ?? 0) === 0);
    if (emptyCategories.length > 0) {
      console.log('\n📌 Categories with no feeds (assign feeds in admin if needed):');
      emptyCategories.forEach((c) => console.log(`   - ${c.name} (${c.slug})`));
    }

    if (updates.length > 0 && !isDryRun) {
      console.log('\n🔄 Applying updates...');
      for (const u of updates) {
        await conn.query(
          'UPDATE rss_feeds SET category_id = ?, updated_at = NOW() WHERE id = ?',
          [u.newCategoryId, u.feedId]
        );
      }
      console.log(`✅ Updated ${updates.length} feeds.`);
    } else if (updates.length > 0 && isDryRun) {
      console.log('\n🔍 DRY RUN – no changes written. Run without --dry-run to apply.');
    }

    conn.release();
    console.log('\nDone.\n');
  } catch (error) {
    console.error('❌', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

main().catch(console.error);
