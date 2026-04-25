#!/usr/bin/env tsx
/**
 * Check category mapping between RSS feeds, posts, and frontend categories
 */

import mariadb from 'mariadb';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
} catch (error) {
  // .env.local might not exist
}

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'zox_user',
  password: process.env.DB_PASSWORD || 'zox_password',
  database: process.env.DB_NAME || 'zox_db',
};

async function main() {
  let pool: mariadb.Pool | null = null;

  try {
    pool = mariadb.createPool({ ...DB, connectionLimit: 2 });
    const conn = await pool.getConnection();

    console.log('='.repeat(100));
    console.log('ROOT CAUSE ANALYSIS: Category Mapping');
    console.log('='.repeat(100));
    console.log();

    // 1. Check frontend category slugs
    console.log('1. FRONTEND CATEGORY SLUGS (from page.tsx):');
    console.log('-'.repeat(100));
    const frontendSlugs = [
      'artificial-intelligence', 'fintech', 'social-media', 'mobility',
      'agritech', 'ecommerce', 'web-3', 'health-tech',
      'cyber-security', 'space-tech', 'foodtech', 'edtech'
    ];
    console.log(frontendSlugs.join(', '));
    console.log();

    // 2. Check which categories exist in database
    console.log('2. CATEGORIES IN DATABASE:');
    console.log('-'.repeat(100));
    const categories = await conn.query(`
      SELECT id, name, slug 
      FROM categories 
      WHERE slug IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ORDER BY slug
    `, frontendSlugs);
    
    if (categories.length === 0) {
      console.log('❌ NO CATEGORIES FOUND with frontend slugs!');
    } else {
      console.log(`✅ Found ${categories.length} categories:`);
      categories.forEach((cat: any) => {
        console.log(`  - [${cat.id}] ${cat.name} (${cat.slug})`);
      });
    }
    console.log();

    // 3. Check RSS feed category assignments
    console.log('3. RSS FEED CATEGORY ASSIGNMENTS:');
    console.log('-'.repeat(100));
    const rssFeeds = await conn.query(`
      SELECT 
        rf.id,
        rf.name,
        rf.category_id,
        c.name as category_name,
        c.slug as category_slug
      FROM rss_feeds rf
      LEFT JOIN categories c ON rf.category_id = c.id
      ORDER BY rf.id
      LIMIT 20
    `);
    
    const categoryCounts: Record<string, number> = {};
    rssFeeds.forEach((feed: any) => {
      const catSlug = feed.category_slug || 'NULL';
      categoryCounts[catSlug] = (categoryCounts[catSlug] || 0) + 1;
    });
    
    console.log(`Total RSS feeds checked: ${rssFeeds.length}`);
    console.log('Category distribution:');
    Object.entries(categoryCounts).forEach(([slug, count]) => {
      const isFrontend = frontendSlugs.includes(slug);
      const icon = isFrontend ? '✅' : '❌';
      console.log(`  ${icon} ${slug}: ${count} feeds`);
    });
    console.log();

    // 4. Check RSS posts category assignments
    console.log('4. RSS POSTS CATEGORY ASSIGNMENTS:');
    console.log('-'.repeat(100));
    const rssPosts = await conn.query(`
      SELECT 
        p.id,
        p.title,
        p.category_id,
        p.status,
        c.name as category_name,
        c.slug as category_slug
      FROM posts p
      INNER JOIN rss_feed_items rfi ON p.id = rfi.post_id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
      LIMIT 20
    `);
    
    const postCategoryCounts: Record<string, number> = {};
    rssPosts.forEach((post: any) => {
      const catSlug = post.category_slug || 'NULL';
      postCategoryCounts[catSlug] = (postCategoryCounts[catSlug] || 0) + 1;
    });
    
    console.log(`Total RSS posts checked: ${rssPosts.length}`);
    console.log('Category distribution:');
    Object.entries(postCategoryCounts).forEach(([slug, count]) => {
      const isFrontend = frontendSlugs.includes(slug);
      const icon = isFrontend ? '✅' : '❌';
      console.log(`  ${icon} ${slug}: ${count} posts`);
    });
    console.log();

    // 5. Check posts by frontend category
    console.log('5. POSTS AVAILABLE FOR FRONTEND CATEGORIES:');
    console.log('-'.repeat(100));
    for (const slug of frontendSlugs) {
      const posts = await conn.query(`
        SELECT COUNT(*) as count
        FROM posts p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE c.slug = ? 
          AND p.status = 'published'
          AND (TRIM(COALESCE(p.content, '')) != '' 
            AND (TRIM(COALESCE(p.featured_image_url, '')) != '' 
              OR p.content LIKE '%<img%'))
      `, [slug]);
      
      const count = posts[0]?.count || 0;
      const icon = count > 0 ? '✅' : '❌';
      console.log(`  ${icon} ${slug}: ${count} published posts`);
    }
    console.log();

    // 6. Root cause summary
    console.log('='.repeat(100));
    console.log('ROOT CAUSE SUMMARY');
    console.log('='.repeat(100));
    
    const allFeedsInWorld = Object.keys(categoryCounts).every(slug => slug === 'world' || slug === 'NULL');
    const allPostsInWorld = Object.keys(postCategoryCounts).every(slug => slug === 'world' || slug === 'NULL');
    const noFrontendCategories = categories.length === 0;
    
    if (noFrontendCategories) {
      console.log('❌ ROOT CAUSE #1: Frontend category slugs do NOT exist in database!');
      console.log('   - Frontend expects: artificial-intelligence, fintech, etc.');
      console.log('   - Database has: (check categories table)');
      console.log('   - SOLUTION: Create categories with matching slugs');
    }
    
    if (allFeedsInWorld) {
      console.log('❌ ROOT CAUSE #2: All RSS feeds are assigned to "World" category!');
      console.log('   - Admin can assign categories, but all feeds point to World');
      console.log('   - SOLUTION: Reassign RSS feeds to correct categories');
    }
    
    if (allPostsInWorld) {
      console.log('❌ ROOT CAUSE #3: All RSS posts are created in "World" category!');
      console.log('   - Posts inherit category from RSS feed');
      console.log('   - Since feeds are in World, posts are in World');
      console.log('   - SOLUTION: Fix RSS feed category assignments');
    }

    conn.release();
    console.log('\n✅ Analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

main().catch(console.error);

