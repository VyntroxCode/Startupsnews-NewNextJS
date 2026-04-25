/**
 * Database Seed Script
 * 
 * This script migrates all data from src/lib/data.ts into the database:
 * - Creates admin user
 * - Creates all categories
 * - Migrates all posts
 * - Migrates all events
 * - Creates post tags
 * 
 * Usage: npm run db:seed
 */

import { getDbConnection, closeDbConnection, query } from '../src/shared/database/connection';
import { mockPosts, startupEvents } from '../src/lib/data';
import { slugify } from '../src/shared/utils/string.utils';
import bcrypt from 'bcryptjs';
import { loadEnvConfig } from '@next/env';

// Load environment variables from .env.local
loadEnvConfig(process.cwd());

// Helper function to generate slug from string (fallback if slugify not available)
function generateSlug(text: string): string {
  return slugify(text);
}

// Helper function to parse date string to Date object
function parseDate(dateString: string): Date {
  // Handle formats like "21 February 2026" or "2025-02-08"
  if (dateString.includes(' ')) {
    // Format: "21 February 2026"
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };

    const parts = dateString.toLowerCase().split(' ');
    if (parts.length >= 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1]] ?? 0;
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
  }

  // Try ISO format
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? new Date() : date;
}

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    const conn = await getDbConnection();
    const connection = await conn.getConnection();

    try {
      // ============================================
      // 1. Create Admin User
      // ============================================
      console.log('📝 Creating admin user...');

      const adminEmail = process.env.ADMIN_EMAIL || 'admin@startupnews.fyi';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!';
      const adminName = process.env.ADMIN_NAME || 'Admin User';

      // Check if admin user already exists
      const existingAdmin = await query<{ id: number }>(
        'SELECT id FROM users WHERE email = ?',
        [adminEmail]
      );

      let adminUserId: number;

      if (existingAdmin.length > 0) {
        adminUserId = existingAdmin[0].id;
        console.log(`   ✅ Admin user already exists (ID: ${adminUserId})`);

        // Update password if needed
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        await query(
          'UPDATE users SET password_hash = ?, name = ?, role = ?, is_active = TRUE WHERE id = ?',
          [passwordHash, adminName, 'admin', adminUserId]
        );
        console.log(`   ✅ Admin password updated`);
      } else {
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        const result = await connection.query(
          `INSERT INTO users (email, password_hash, name, role, is_active) 
           VALUES (?, ?, ?, 'admin', TRUE)`,
          [adminEmail, passwordHash, adminName]
        ) as { insertId: number };

        adminUserId = result.insertId;
        console.log(`   ✅ Admin user created (ID: ${adminUserId})`);
        console.log(`   📧 Email: ${adminEmail}`);
        console.log(`   🔑 Password: ${adminPassword}`);
      }

      // ============================================
      // 2. Create Categories
      // ============================================
      console.log('\n📂 Creating categories...');

      // Extract unique categories from posts
      const categoryMap = new Map<string, { name: string; slug: string }>();

      // Add categories from posts
      for (const post of mockPosts) {
        if (post.category && post.categorySlug) {
          const slug = post.categorySlug.toLowerCase().replace(/[&.]/g, '').replace(/\s+/g, '-');
          if (!categoryMap.has(slug)) {
            categoryMap.set(slug, {
              name: post.category,
              slug: slug,
            });
          }
        }
      }

      // Add categories from events (location-based)
      const eventLocations = new Set(startupEvents.map(e => e.location));
      for (const location of eventLocations) {
        const slug = generateSlug(location);
        if (!categoryMap.has(slug)) {
          categoryMap.set(slug, {
            name: location,
            slug: slug,
          });
        }
      }

      const categoryIdMap = new Map<string, number>();
      let categorySortOrder = 0;

      for (const [slug, category] of categoryMap) {
        // Check if category exists
        const existing = await query<{ id: number }>(
          'SELECT id FROM categories WHERE slug = ?',
          [slug]
        );

        let categoryId: number;

        if (existing.length > 0) {
          categoryId = existing[0].id;
          console.log(`   ✅ Category "${category.name}" already exists (ID: ${categoryId})`);
        } else {
          const result = await connection.query(
            `INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)`,
            [category.name, slug, categorySortOrder++]
          ) as { insertId: number };

          categoryId = result.insertId;
          console.log(`   ✅ Category "${category.name}" created (ID: ${categoryId})`);
        }

        categoryIdMap.set(slug, categoryId);
      }

      console.log(`   ✅ Total categories: ${categoryIdMap.size}`);

      // ============================================
      // 3. Migrate Posts
      // ============================================
      console.log('\n📰 Migrating posts...');

      let postsCreated = 0;
      let postsSkipped = 0;

      for (const post of mockPosts) {
        try {
          // Check if post already exists
          const existing = await query<{ id: number }>(
            'SELECT id FROM posts WHERE slug = ?',
            [post.slug]
          );

          if (existing.length > 0) {
            postsSkipped++;
            continue;
          }

          // Get category ID
          const categorySlug = post.categorySlug.toLowerCase().replace(/[&.]/g, '').replace(/\s+/g, '-');
          const categoryId = categoryIdMap.get(categorySlug);

          if (!categoryId) {
            console.log(`   ⚠️  Category not found for post "${post.title}", skipping...`);
            postsSkipped++;
            continue;
          }

          // Parse published date
          const publishedDate = parseDate(post.date);
          const isPublished = post.featured !== false; // Most posts should be published

          // Insert post
          const result = await connection.query(
            `INSERT INTO posts (
              title, slug, excerpt, content, category_id, author_id,
              featured_image_url, featured_image_small_url, format, status, featured,
              published_at, trending_score, view_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              post.title,
              post.slug,
              post.excerpt || '',
              post.content || '<p>Content...</p>',
              categoryId,
              adminUserId,
              post.image || null,
              post.imageSmall || post.image || null,
              post.format || 'standard',
              isPublished ? 'published' : 'draft',
              post.featured ? 1 : 0,
              isPublished ? publishedDate : null,
              0, // trending_score
              0, // view_count
            ]
          ) as { insertId: number };

          const postId = result.insertId;

          // Insert tags if any
          if (post.tags && post.tags.length > 0) {
            for (const tag of post.tags) {
              await query(
                'INSERT INTO post_tags (post_id, tag_name) VALUES (?, ?)',
                [postId, tag]
              );
            }
          }

          postsCreated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`   ❌ Error migrating post "${post.title}":`, errorMessage);
          postsSkipped++;
        }
      }

      console.log(`   ✅ Posts created: ${postsCreated}`);
      console.log(`   ⏭️  Posts skipped (already exist): ${postsSkipped}`);

      // ============================================
      // 4. Migrate Events
      // ============================================
      console.log('\n📅 Migrating events...');

      let eventsCreated = 0;
      let eventsSkipped = 0;

      for (const event of startupEvents) {
        try {
          // Generate slug from title
          const eventSlug = generateSlug(event.title);

          // Check if event already exists
          const existing = await query<{ id: number }>(
            'SELECT id FROM events WHERE slug = ?',
            [eventSlug]
          );

          if (existing.length > 0) {
            eventsSkipped++;
            continue;
          }

          // Parse event date
          const eventDate = parseDate(event.date);

          // Determine status based on date
          const now = new Date();
          let status: 'upcoming' | 'ongoing' | 'past' | 'cancelled' = 'upcoming';
          if (eventDate < now) {
            status = 'past';
          }

          // Insert event
          await connection.query(
            `INSERT INTO events (
              title, slug, excerpt, description, location, event_date,
              image_url, external_url, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              event.title,
              eventSlug,
              event.excerpt || null,
              event.excerpt || null, // Use excerpt as description if available
              event.location,
              eventDate,
              event.image || null,
              event.url || null,
              status,
            ]
          );

          eventsCreated++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`   ❌ Error migrating event "${event.title}":`, errorMessage);
          eventsSkipped++;
        }
      }

      console.log(`   ✅ Events created: ${eventsCreated}`);
      console.log(`   ⏭️  Events skipped (already exist): ${eventsSkipped}`);

      // ============================================
      // Summary
      // ============================================
      console.log('\n' + '='.repeat(50));
      console.log('✅ Database seed completed successfully!');
      console.log('='.repeat(50));
      console.log(`\n📊 Summary:`);
      console.log(`   👤 Admin User: ${adminEmail} / ${adminPassword}`);
      console.log(`   📂 Categories: ${categoryIdMap.size}`);
      console.log(`   📰 Posts: ${postsCreated} created, ${postsSkipped} skipped`);
      console.log(`   📅 Events: ${eventsCreated} created, ${eventsSkipped} skipped`);
      console.log(`\n🔗 Admin Panel: http://localhost:3000/admin`);
      console.log(`🔗 API Health: http://localhost:3000/api/health`);
      console.log('\n');

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await closeDbConnection();
  }
}

// Run seed
seedDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

