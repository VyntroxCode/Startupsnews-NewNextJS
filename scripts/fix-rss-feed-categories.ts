#!/usr/bin/env tsx
/**
 * Fix RSS Feed Categories - Root Level Solution
 * Updates all feeds currently in "World" category to correct frontend categories
 * 
 * Usage: npx tsx scripts/fix-rss-feed-categories.ts [--dry-run]
 * Requires: .env.local with DB_* variables
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

// Frontend category slugs
const FRONTEND_CATEGORIES = [
  'artificial-intelligence', 'fintech', 'social-media', 'mobility',
  'agritech', 'ecommerce', 'web-3', 'health-tech',
  'cyber-security', 'space-tech', 'foodtech', 'edtech'
];

// Comprehensive category mapping based on feed name and URL patterns
function mapFeedToCategory(feedName: string, feedUrl: string): string | null {
  const name = feedName.toLowerCase();
  const url = feedUrl.toLowerCase();

  // Web 3.0 / Blockchain / Crypto
  if (
    name.includes('blockchain') || name.includes('crypto') || name.includes('cryptocurrency') ||
    url.includes('/crypto/') || url.includes('/blockchain/') || url.includes('/cryptocurrency/') ||
    name.includes('tech in asia – blockchain') || name.includes('gadget360 - blockchain')
  ) {
    return 'web-3';
  }

  // Artificial Intelligence / AI
  if (
    name.includes('artificial intelligence') || name.includes('artificial-intelligence') ||
    name.includes(' ai ') || name.endsWith(' ai') || name.startsWith('ai ') ||
    url.includes('/artificial-intelligence/') || url.includes('/ai/') ||
    name.includes('techcrunch - ai') || name.includes('telecomtalk - artificialintelligence') ||
    name.includes('indiatimes (et) - artificialintelligence') || name.includes('gadget360 – ai')
  ) {
    return 'artificial-intelligence';
  }

  // Fintech
  if (
    name.includes('fintech') || name.includes('fin tech') || name.includes('finance') ||
    url.includes('/fintech/') || url.includes('/finance/') ||
    name.includes('techcrunch – fintech') || name.includes('startupstorymedia – fintech') ||
    name.includes('indiatimes (et) - fintech') || name.includes('inc42 - fintech') ||
    name.includes('pnn - finance') || name.includes('pnn - finance')
  ) {
    return 'fintech';
  }

  // Social Media
  if (
    name.includes('social media') || name.includes('social-media') || name.includes('socialmedia') ||
    url.includes('/social/') || url.includes('/social-media/') ||
    name.includes('techcrunch – socialmedia') || name.includes('wabetainfo - socialmedia') ||
    name.includes('startupstorymedia - socialmedia')
  ) {
    return 'social-media';
  }

  // Mobility / Transportation
  if (
    name.includes('mobility') || name.includes('transport') || name.includes('travel') ||
    url.includes('/mobility/') || url.includes('/transport/') || url.includes('/travel/') ||
    name.includes('techcrunch –  mobility') || name.includes('inc42 - mobility') ||
    name.includes('inc42 - traveltech')
  ) {
    return 'mobility';
  }

  // Agritech
  if (
    name.includes('agritech') || name.includes('agri tech') || name.includes('agriculture') ||
    url.includes('/agritech/') || url.includes('/agriculture/') ||
    name.includes('inc42 - agritech')
  ) {
    return 'agritech';
  }

  // eCommerce
  if (
    name.includes('ecommerce') || name.includes('e-commerce') || name.includes('retail') ||
    url.includes('/ecommerce/') || url.includes('/e-commerce/') || url.includes('/retail/') ||
    name.includes('techcrunch – ecommerce') || name.includes('inc42 - ecommerce') ||
    name.includes('inc42 - retail') || name.includes('tech in asia – ecommerce')
  ) {
    return 'ecommerce';
  }

  // HealthTech
  if (
    name.includes('healthtech') || name.includes('health tech') || name.includes('health') ||
    url.includes('/health/') || url.includes('/healthtech/') ||
    name.includes('techcrunch – healthtech') || name.includes('inc42 - healthtech') ||
    name.includes('startupstorymedia - healthtech') || name.includes('pnn - health')
  ) {
    return 'health-tech';
  }

  // EdTech
  if (
    name.includes('edtech') || name.includes('ed tech') || name.includes('education') ||
    url.includes('/edtech/') || url.includes('/education/') ||
    name.includes('inc42 - edtech') || name.includes('pnn - education')
  ) {
    return 'edtech';
  }

  // Cyber Security
  if (
    name.includes('cyber') || name.includes('security') || name.includes('cybersecurity') ||
    url.includes('/cyber/') || url.includes('/security/')
  ) {
    return 'cyber-security';
  }

  // SpaceTech
  if (
    name.includes('space') || name.includes('aerospace') ||
    url.includes('/space/') || url.includes('/aerospace/')
  ) {
    return 'space-tech';
  }

  // FoodTech
  if (
    name.includes('foodtech') || name.includes('food tech') || name.includes('food') ||
    url.includes('/foodtech/') || url.includes('/food/')
  ) {
    return 'foodtech';
  }

  // CleanTech / Energy
  if (
    name.includes('cleantech') || name.includes('clean tech') || name.includes('energy') ||
    url.includes('/cleantech/') || url.includes('/energy/') ||
    name.includes('inc42 – cleantech') || name.includes('indiatimes (et) - cleantech')
  ) {
    return 'artificial-intelligence'; // Map to AI as closest match
  }

  // LogisticsTech
  if (
    name.includes('logisticstech') || name.includes('logistics tech') || name.includes('logistics') ||
    url.includes('/logistics/') ||
    name.includes('inc42 - logisticstech')
  ) {
    return 'mobility'; // Logistics is related to mobility
  }

  // EnterpriseTech
  if (
    name.includes('enterprisetech') || name.includes('enterprise tech') ||
    name.includes('inc42 - enterprisetech')
  ) {
    return 'artificial-intelligence'; // Enterprise tech often involves AI
  }

  // ConsumerServices
  if (
    name.includes('consumerservices') || name.includes('consumer services') ||
    name.includes('inc42 - consumerservices')
  ) {
    return 'ecommerce'; // Consumer services related to ecommerce
  }

  // RealEstateTech
  if (
    name.includes('realestatetech') || name.includes('real estate') ||
    name.includes('inc42 – realestatetech')
  ) {
    return 'artificial-intelligence'; // PropTech often uses AI
  }

  // Funding - map to Fintech
  if (
    name.includes('funding') || url.includes('/funding/') ||
    name.includes('startupstorymedia – funding') || name.includes('indiatimes (et) - funding') ||
    name.includes('techcrunch - funding') || name.includes('thestartuplab - funding')
  ) {
    return 'fintech'; // Funding is financial
  }

  // Default: General tech feeds go to Artificial Intelligence (most common category)
  if (
    name.includes('tech') || name.includes('technology') || 
    url.includes('/tech/') || url.includes('/technology/')
  ) {
    return 'artificial-intelligence';
  }

  return null;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  let pool: mariadb.Pool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = mariadb.createPool({ ...DB, connectionLimit: 2 });
    const conn = await pool.getConnection();

    // Get World category ID
    const worldCat = await conn.query<Category[]>(`SELECT id, name, slug FROM categories WHERE slug = 'world' LIMIT 1`);
    if (worldCat.length === 0) {
      console.error('❌ World category not found!');
      return;
    }
    const worldId = worldCat[0].id;
    console.log(`✅ Found World category: ID ${worldId}\n`);

    // Get all frontend categories
    console.log('📊 Fetching frontend categories...');
    const categories = await conn.query<Category[]>(`
      SELECT id, name, slug 
      FROM categories 
      WHERE slug IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ORDER BY slug
    `, FRONTEND_CATEGORIES);

    const categoryMap: Record<string, number> = {};
    categories.forEach(cat => {
      categoryMap[cat.slug] = cat.id;
    });

    console.log(`✅ Found ${categories.length} frontend categories:`);
    categories.forEach(cat => {
      console.log(`   - [${cat.id}] ${cat.name} (${cat.slug})`);
    });
    console.log();

    // Get all feeds in World category
    console.log('📰 Fetching feeds in World category...');
    const worldFeeds = await conn.query<RssFeed[]>(`
      SELECT id, name, url, category_id
      FROM rss_feeds
      WHERE category_id = ?
      ORDER BY id
    `, [worldId]);

    console.log(`✅ Found ${worldFeeds.length} feeds in World category\n`);

    // Map feeds to categories
    console.log('='.repeat(100));
    console.log('CATEGORY MAPPING');
    console.log('='.repeat(100));
    console.log();

    const updates: Array<{ feedId: number; feedName: string; oldCategoryId: number; newCategoryId: number; categorySlug: string; categoryName: string }> = [];
    const unmapped: Array<{ feedId: number; feedName: string; url: string }> = [];

    for (const feed of worldFeeds) {
      const categorySlug = mapFeedToCategory(feed.name, feed.url);
      
      if (categorySlug && categoryMap[categorySlug]) {
        const newCategoryId = categoryMap[categorySlug];
        const category = categories.find(c => c.slug === categorySlug);
        updates.push({
          feedId: feed.id,
          feedName: feed.name,
          oldCategoryId: feed.category_id,
          newCategoryId,
          categorySlug,
          categoryName: category?.name || categorySlug,
        });
      } else {
        unmapped.push({
          feedId: feed.id,
          feedName: feed.name,
          url: feed.url,
        });
      }
    }

    // Display updates
    if (updates.length > 0) {
      console.log(`📝 FEEDS TO UPDATE (${updates.length}):`);
      console.log('-'.repeat(100));
      
      const updatesByCategory: Record<string, typeof updates> = {};
      updates.forEach(update => {
        if (!updatesByCategory[update.categorySlug]) {
          updatesByCategory[update.categorySlug] = [];
        }
        updatesByCategory[update.categorySlug].push(update);
      });

      for (const [slug, categoryUpdates] of Object.entries(updatesByCategory)) {
        const cat = categories.find(c => c.slug === slug);
        console.log(`\n📂 ${cat?.name || slug} (${categoryUpdates.length} feeds):`);
        for (const update of categoryUpdates) {
          console.log(`   [${update.feedId}] ${update.feedName}`);
        }
      }
    } else {
      console.log('⚠️  No feeds could be automatically mapped!');
    }

    // Display unmapped feeds
    if (unmapped.length > 0) {
      console.log(`\n\n⚠️  UNMAPPED FEEDS (${unmapped.length} - will remain in World):`);
      console.log('-'.repeat(100));
      unmapped.forEach(feed => {
        console.log(`   [${feed.feedId}] ${feed.feedName}`);
        console.log(`      URL: ${feed.url}`);
      });
    }

    // Apply updates
    if (updates.length > 0 && !isDryRun) {
      console.log(`\n\n🔄 Applying ${updates.length} updates...`);
      console.log('-'.repeat(100));
      
      for (const update of updates) {
        await conn.query(
          'UPDATE rss_feeds SET category_id = ?, updated_at = NOW() WHERE id = ?',
          [update.newCategoryId, update.feedId]
        );
        console.log(`✅ [${update.feedId}] ${update.feedName} → ${update.categoryName}`);
      }
      
      console.log(`\n✅ Successfully updated ${updates.length} feeds!`);
    } else if (updates.length > 0 && isDryRun) {
      console.log(`\n\n⚠️  DRY RUN MODE - No changes made`);
      console.log(`Would update ${updates.length} feeds`);
    }

    conn.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    if (pool) await pool.end();
    process.exit(1);
  }
}

main();

