/**
 * Quick verification script to check posts in database
 */

import { loadEnvConfig } from '@next/env';
import { getDbConnection, closeDbConnection, query, queryOne } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

async function verify() {
  try {
    console.log('\n📊 Database Verification\n');
    
    // Total posts
    const total = await queryOne<any>(
      'SELECT COUNT(*) as count FROM posts WHERE status = "published"'
    );
    console.log(`✅ Total Posts: ${total?.count || 0}`);

    // Category distribution
    const byCategory = await query<any>(
      `SELECT c.name, c.slug, COUNT(*) as count 
       FROM posts p 
       JOIN categories c ON p.category_id = c.id 
       WHERE p.status = "published"
       GROUP BY c.id, c.name, c.slug
       ORDER BY count DESC`
    );
    
    console.log('\n📂 Posts by Category:');
    for (const cat of byCategory) {
      console.log(`   ${cat.name}: ${cat.count}`);
    }

    // Date range
    const dates = await queryOne<any>(
      `SELECT 
        MAX(published_at) as latest,
        MIN(published_at) as oldest
       FROM posts WHERE status = "published"`
    );
    
    console.log(`\n📅 Date Range:`);
    console.log(`   Latest: ${dates?.latest}`);
    console.log(`   Oldest: ${dates?.oldest}`);

    // Recent startup news posts
    const recent = await query<any>(
      `SELECT title, published_at, c.name
       FROM posts p
       JOIN categories c ON p.category_id = c.id
       WHERE p.status = "published"
       ORDER BY p.published_at DESC
       LIMIT 10`
    );

    console.log(`\n🔝 Latest 10 Posts:`);
    for (const post of recent) {
      console.log(`   • ${post.title.slice(0, 60)}...`);
    }

    console.log('\n');
    
    await closeDbConnection();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

verify();
