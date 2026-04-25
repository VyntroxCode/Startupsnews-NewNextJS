#!/usr/bin/env ts-node
/**
 * Test all RSS feeds from terminal
 * Checks database status and validates RSS feed URLs
 * 
 * Usage: npx ts-node scripts/test-rss-feeds.ts
 * Requires: .env.local with DB_* variables
 */

import mariadb from 'mariadb';
import Parser from 'rss-parser';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
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
  // .env.local might not exist, that's okay - use defaults or env vars
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
  enabled: number;
  auto_publish: number;
  fetch_interval_minutes: number;
  max_items_per_fetch: number;
  last_fetched_at: Date | string | null;
  last_error: string | null;
  error_count: number;
  category_id: number;
  category_name?: string;
  category_slug?: string;
}

interface TestResult {
  feed: RssFeed;
  accessible: boolean;
  valid: boolean;
  itemCount: number;
  error?: string;
  responseTime?: number;
}

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  },
});

async function testRssFeed(feed: RssFeed): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    feed,
    accessible: false,
    valid: false,
    itemCount: 0,
  };

  try {
    const parsed = await parser.parseURL(feed.url);
    const responseTime = Date.now() - startTime;
    
    result.accessible = true;
    result.valid = true;
    result.itemCount = parsed.items?.length || 0;
    result.responseTime = responseTime;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    result.accessible = false;
    result.valid = false;
    result.error = error instanceof Error ? error.message : String(error);
    result.responseTime = responseTime;
  }

  return result;
}

async function main() {
  let pool: mariadb.Pool | null = null;

  try {
    console.log('🔌 Connecting to database...');
    pool = mariadb.createPool({ ...DB, connectionLimit: 2 });
    const conn = await pool.getConnection();

    // Query all RSS feeds with category info
    console.log('📊 Fetching RSS feeds from database...\n');
    const feeds = await conn.query<RssFeed[]>(`
      SELECT 
        rf.id,
        rf.name,
        rf.url,
        rf.enabled,
        rf.auto_publish,
        rf.fetch_interval_minutes,
        rf.max_items_per_fetch,
        rf.last_fetched_at,
        rf.last_error,
        rf.error_count,
        rf.category_id,
        c.name as category_name,
        c.slug as category_slug
      FROM rss_feeds rf
      LEFT JOIN categories c ON rf.category_id = c.id
      ORDER BY rf.id
    `);

    if (feeds.length === 0) {
      console.log('❌ No RSS feeds found in database.\n');
      conn.release();
      return;
    }

    console.log(`📰 Found ${feeds.length} RSS feed(s)\n`);
    console.log('='.repeat(100));
    console.log('RSS FEED STATUS REPORT');
    console.log('='.repeat(100));
    console.log();

    // Display database status
    console.log('📋 DATABASE STATUS:');
    console.log('-'.repeat(100));
    for (const feed of feeds) {
      const status = feed.enabled ? '✅ ENABLED' : '❌ DISABLED';
      const autoPub = feed.auto_publish ? '✅ Auto-publish' : '❌ Manual';
      const lastFetch = feed.last_fetched_at 
        ? new Date(feed.last_fetched_at).toLocaleString()
        : 'Never';
      const hasError = feed.last_error ? '⚠️  HAS ERROR' : '✅ No errors';
      const errorCount = feed.error_count > 0 ? `(${feed.error_count} errors)` : '';

      console.log(`\n[${feed.id}] ${feed.name}`);
      console.log(`  URL: ${feed.url}`);
      console.log(`  Status: ${status} | ${autoPub}`);
      console.log(`  Category: ${feed.category_name || 'N/A'} (${feed.category_slug || 'N/A'})`);
      console.log(`  Interval: ${feed.fetch_interval_minutes} min | Max items: ${feed.max_items_per_fetch}`);
      console.log(`  Last fetch: ${lastFetch}`);
      console.log(`  Error status: ${hasError} ${errorCount}`);
      if (feed.last_error) {
        console.log(`  Last error: ${feed.last_error.substring(0, 150)}${feed.last_error.length > 150 ? '...' : ''}`);
      }
    }

    console.log('\n\n');
    console.log('='.repeat(100));
    console.log('RSS FEED URL VALIDATION');
    console.log('='.repeat(100));
    console.log();

    // Test each feed
    const results: TestResult[] = [];
    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i];
      process.stdout.write(`\r🧪 Testing [${i + 1}/${feeds.length}] ${feed.name}...`);
      const result = await testRssFeed(feed);
      results.push(result);
    }
    console.log('\n');

    // Display test results
    console.log('📊 TEST RESULTS:');
    console.log('-'.repeat(100));
    for (const result of results) {
      const statusIcon = result.valid ? '✅' : '❌';
      const statusText = result.valid ? 'VALID' : 'INVALID';
      const timeText = result.responseTime ? `${result.responseTime}ms` : 'N/A';

      console.log(`\n[${result.feed.id}] ${result.feed.name}`);
      console.log(`  Status: ${statusIcon} ${statusText} (${timeText})`);
      console.log(`  URL: ${result.feed.url}`);
      
      if (result.valid) {
        console.log(`  Items found: ${result.itemCount}`);
      } else {
        console.log(`  Error: ${result.error || 'Unknown error'}`);
      }
    }

    // Summary
    console.log('\n\n');
    console.log('='.repeat(100));
    console.log('SUMMARY');
    console.log('='.repeat(100));
    
    const totalFeeds = results.length;
    const enabledFeeds = results.filter(r => r.feed.enabled).length;
    const validFeeds = results.filter(r => r.valid).length;
    const feedsWithErrors = results.filter(r => r.feed.last_error).length;
    const neverFetched = results.filter(r => !r.feed.last_fetched_at).length;

    console.log(`Total feeds: ${totalFeeds}`);
    console.log(`Enabled: ${enabledFeeds} | Disabled: ${totalFeeds - enabledFeeds}`);
    console.log(`Valid URLs: ${validFeeds} | Invalid URLs: ${totalFeeds - validFeeds}`);
    console.log(`Feeds with errors: ${feedsWithErrors}`);
    console.log(`Never fetched: ${neverFetched}`);

    // Recommendations
    console.log('\n\n');
    console.log('='.repeat(100));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(100));
    
    const invalidFeeds = results.filter(r => !r.valid);
    if (invalidFeeds.length > 0) {
      console.log('\n❌ Invalid RSS feeds (fix URLs):');
      invalidFeeds.forEach(r => {
        console.log(`  - [${r.feed.id}] ${r.feed.name}: ${r.error}`);
      });
    }

    const disabledFeeds = results.filter(r => !r.feed.enabled);
    if (disabledFeeds.length > 0) {
      console.log('\n⚠️  Disabled feeds (enable if needed):');
      disabledFeeds.forEach(r => {
        console.log(`  - [${r.feed.id}] ${r.feed.name}`);
      });
    }

    const feedsWithDbErrors = results.filter(r => r.feed.last_error);
    if (feedsWithDbErrors.length > 0) {
      console.log('\n⚠️  Feeds with database errors (check last_error):');
      feedsWithDbErrors.forEach(r => {
        console.log(`  - [${r.feed.id}] ${r.feed.name}: ${r.feed.last_error?.substring(0, 100)}`);
      });
    }

    const neverFetchedFeeds = results.filter(r => !r.feed.last_fetched_at);
    if (neverFetchedFeeds.length > 0) {
      console.log('\n⚠️  Feeds never fetched (test manually):');
      neverFetchedFeeds.forEach(r => {
        console.log(`  - [${r.feed.id}] ${r.feed.name}`);
      });
    }

    conn.release();
    console.log('\n✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

main().catch(console.error);

