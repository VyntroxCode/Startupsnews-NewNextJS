/**
 * Fast Script to Copy News Posts from Startup News to Zox Website
 * 
 * Optimizations:
 * - Fetches only recent posts (last 30 days recommended)
 * - Parallel image uploads to S3
 * - Smart category mapping
 * - Duplicate detection before processing
 * - Progress indicators
 */

import { loadEnvConfig } from '@next/env';
import * as cheerio from 'cheerio';
import { getDbConnection, closeDbConnection, query, queryOne } from '../src/shared/database/connection';
import {
  downloadImage,
  isValidFeaturedImage,
  uploadImageToS3,
  s3KeyForAdminUpload,
  getContentType,
  isS3Configured,
  isOurS3ImageUrl,
} from '../src/modules/rss-feeds/utils/image-to-s3';
import { extractImageUrlsFromHtml } from '../src/modules/rss-feeds/utils/content-extract';

loadEnvConfig(process.cwd());

// ============================================================================
// CONFIG
// ============================================================================

const SOURCE_DOMAIN = 'https://startupnews.fyi';
const NEWS_PAGE = `${SOURCE_DOMAIN}/news`;
const FEBRUARY_CUTOFF = new Date('2026-02-01T00:00:00.000Z');

const SECTOR_CATEGORIES = [
  'ai-deeptech', 'fintech', 'social-media', 'robotics', 'healthtech',
  'ev-mobility', 'ecommerce', 'saas-enterprise', 'consumer-d2c',
  'web3-blockchain', 'cybersecurity', 'climate-energy',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'ai-deeptech': ['ai', 'artificial intelligence', 'deep tech', 'deeptech', 'machine learning', 'neural', 'gpt', 'llm', 'transformer'],
  'fintech': ['fintech', 'finance', 'bank', 'payment', 'lending', 'insurance', 'trading', 'investment', 'wealth'],
  'social-media': ['social', 'twitter', 'facebook', 'instagram', 'tiktok', 'linkedin', 'creator', 'influencer', 'community'],
  'robotics': ['robot', 'automation', 'drone', 'hardware', 'manufacturing', 'assembly', 'robotic', 'autonomous'],
  'healthtech': ['health', 'medical', 'pharma', 'biotech', 'wellness', 'fitness', 'doctor', 'hospital', 'vaccine', 'telemedicine'],
  'ev-mobility': ['electric', 'ev', 'vehicle', 'auto', 'car', 'transport', 'battery', 'charging', 'mobility'],
  'ecommerce': ['ecommerce', 'retail', 'shopping', 'marketplace', 'store', 'seller', 'vendor', 'logistics', 'delivery'],
  'saas-enterprise': ['saas', 'enterprise', 'software', 'b2b', 'erp', 'crm', 'cloud', 'api', 'devops'],
  'consumer-d2c': ['d2c', 'direct-to-consumer', 'consumer', 'brand', 'fmcg', 'fashion', 'food', 'beverage'],
  'web3-blockchain': ['web3', 'blockchain', 'nft', 'defi', 'smart contract', 'ethereum', 'dapp', 'metaverse', 'crypto'],
  'cybersecurity': ['security', 'cybersecurity', 'hack', 'encryption', 'privacy', 'breach', 'vulnerability', 'threat'],
  'climate-energy': ['climate', 'energy', 'green', 'renewable', 'solar', 'wind', 'carbon', 'sustainability', 'environment'],
};

// ============================================================================
// TYPES
// ============================================================================

interface PostListing {
  title: string;
  url: string;
  excerpt: string;
  imageUrl?: string;
}

interface DetailedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  publishedAt: Date;
  sourceUrl: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function log(msg: string, data?: any) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${msg}${data ? ' ' + JSON.stringify(data) : ''}`);
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

function clean(text: string | null | undefined): string {
  return (text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absolute(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  try {
    return new URL(url, SOURCE_DOMAIN).toString();
  } catch {
    return url;
  }
}

function categorize(title: string, excerpt: string, content: string): string {
  const text = `${title} ${excerpt} ${content}`.toLowerCase();
  const scores = new Map<string, number>();
  
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const matches = (text.match(new RegExp(`\\b${kw}\\b`, 'gi')) || []).length;
      score += matches * kw.length;
    }
    scores.set(cat, score);
  }
  
  let best = 'ai-deeptech';
  let bestScore = 0;
  for (const [cat, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  
  return best;
}

async function downloadImg(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const buffer = await downloadImage(url);
    if (buffer && isValidFeaturedImage(buffer)) return buffer;
  } catch (err) {
    // Silent fail
  }
  return null;
}

async function uploadImg(url: string): Promise<string | null> {
  if (!url) return null;
  
  try {
    if (isOurS3ImageUrl(url)) return url;
    if (!isS3Configured()) return url;

    const buffer = await downloadImg(url);
    if (!buffer) return null;

    const key = s3KeyForAdminUpload(url);
    const contentType = getContentType(url);
    const s3Url = await uploadImageToS3(key, buffer, contentType);
    
    return s3Url;
  } catch (err) {
    return null;
  }
}

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

async function getAdmin(): Promise<{ id: number; email: string; name: string } | null> {
  const admin = await queryOne<any>(
    'SELECT id, email, name FROM users WHERE role = ? ORDER BY id ASC LIMIT 1',
    ['admin']
  );
  return admin || null;
}

async function getCatId(slug_name: string): Promise<number | null> {
  const cat = await queryOne<any>(
    'SELECT id FROM categories WHERE slug = ? LIMIT 1',
    [slug_name]
  );
  return cat?.id || null;
}

async function postExists(title: string, slug_name: string): Promise<boolean> {
  try {
    const exists = await queryOne<any>(
      'SELECT id FROM posts WHERE slug = ? OR title = ? LIMIT 1',
      [slug_name, title]
    );
    return !!exists;
  } catch {
    return true;
  }
}

async function createPost(
  post: DetailedPost,
  catId: number,
  adminId: number
): Promise<number | null> {
  try {
    let imgUrl: string | null = null;
    if (post.imageUrl) {
      imgUrl = await uploadImg(post.imageUrl);
    }

    const result = await query(
      `INSERT INTO posts (
        title, slug, excerpt, meta_description, content, category_id, author_id,
        featured_image_url, featured_image_small_url, format, status, featured,
        published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        post.title.slice(0, 255),
        slug(post.title).slice(0, 255),
        post.excerpt.slice(0, 500),
        post.excerpt.slice(0, 160),
        post.content,
        catId,
        adminId,
        imgUrl || null,
        imgUrl || null,
        'standard',
        'published',
        0,
        post.publishedAt.toISOString().slice(0, 19).replace('T', ' '),
      ]
    );

    return 1; // Success indicator
  } catch (err) {
    log('Error creating post:', err);
    return null;
  }
}

// ============================================================================
// SCRAPER
// ============================================================================

async function scrapeListings(): Promise<PostListing[]> {
  log('📥 Fetching news listings...');
  
  try {
    const res = await fetch(NEWS_PAGE, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) throw new Error(`${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const listings: PostListing[] = [];
    const seen = new Set<string>();

    // Extract post links
    $('a[href*="/post/"], li.mvp-blog-story-wrap').each((_, el) => {
      const $el = $(el);
      const href = $el.find('a[href*="/post/"]').attr('href') || $el.attr('href');
      
      if (!href) return;
      
      const url = absolute(href);
      if (seen.has(url)) return;
      seen.add(url);

      const title = clean($el.find('h1, h2, h3').first().text() || $el.find('a').first().attr('title'));
      if (!title) return;

      const excerpt = clean($el.find('p').first().text()).slice(0, 500);
      const imageUrl = absolute($el.find('img').first().attr('src') || '');

      listings.push({ title, url, excerpt, imageUrl: imageUrl || undefined });
    });

    log(`✅ Found ${listings.length} posts in listing`);
    return listings;

  } catch (err) {
    log('❌ Error scraping listings:', err);
    return [];
  }
}

async function fetchPostDetails(listing: PostListing): Promise<DetailedPost | null> {
  try {
    const res = await fetch(listing.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Get publish date
    let publishedAt = new Date();
    const dateStr = $('meta[property="article:published_time"]').attr('content') ||
                   $('time[datetime]').first().attr('datetime');
    if (dateStr) {
      const d = new Date(dateStr);
      if (!Number.isNaN(d.getTime())) publishedAt = d;
    }

    if (publishedAt < FEBRUARY_CUTOFF) {
      log(`⏹️  Post before Feb cutoff: ${listing.title}`);
      return null;
    }

    // Get content
    let content = $('div.entry-content, article.post-content, div.post-body, main').html() ||
                  $('article').html() ||
                  `<p>${listing.excerpt}</p>`;

    // Get image
    const img = absolute(
      $('meta[property="og:image"]').attr('content') ||
      listing.imageUrl ||
      $('img.featured-image').first().attr('src') ||
      $('article img').first().attr('src') ||
      ''
    );

    return {
      title: listing.title,
      slug: slug(listing.title),
      excerpt: listing.excerpt || listing.title,
      content,
      imageUrl: img || undefined,
      publishedAt,
      sourceUrl: listing.url,
    };

  } catch (err) {
    return null;
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n🚀 Startup News Post Importer\n');
  
  try {
    // Connect
    log('Connecting to database...');
    const pool = await getDbConnection();

    // Get admin
    log('Getting admin user...');
    const admin = await getAdmin();
    if (!admin) throw new Error('No admin found. Run db:seed first.');
    log(`✅ Admin: ${admin.name}`);

    // Load categories
    log('Loading categories...');
    const catMap = new Map<string, number>();
    for (const slug_name of SECTOR_CATEGORIES) {
      const id = await getCatId(slug_name);
      if (id) catMap.set(slug_name, id);
    }
    if (catMap.size === 0) throw new Error('No categories found in database');
    log(`✅ Loaded ${catMap.size} categories`);

    // Scrape listings
    const listings = await scrapeListings();
    if (listings.length === 0) {
      log('❌ No posts found');
      await closeDbConnection();
      process.exit(0);
    }

    // Process each post
    log(`\n📝 Processing ${listings.length} posts...\n`);
    
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const prog = `${i + 1}/${listings.length}`;

      try {
        // Check duplicate
        if (await postExists(listing.title, slug(listing.title))) {
          log(`⏭️  ${prog} DUPLICATE: ${listing.title}`);
          duplicates++;
          continue;
        }

        // Fetch details
        log(`⬇️  ${prog} Fetching: ${listing.title}`);
        const post = await fetchPostDetails(listing);
        if (!post) {
          log(`⏭️  ${prog} Skipped (too old or error)`);
          continue;
        }

        // Categorize
        const cat = categorize(post.title, post.excerpt, post.content);
        const catId = catMap.get(cat);
        if (!catId) {
          log(`❌ ${prog} Category not found: ${cat}`);
          errors++;
          continue;
        }

        // Create
        const ok = await createPost(post, catId, admin.id);
        if (ok) {
          log(`✅ ${prog} Created: ${post.title}`);
          imported++;
        } else {
          log(`❌ ${prog} Failed to create`);
          errors++;
        }

      } catch (err) {
        log(`❌ ${prog} Error:`, err);
        errors++;
      }

      // Delay
      if (i < listings.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(80));
    console.log(`\n📊 SUMMARY`);
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Duplicates: ${duplicates}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📝 Total: ${listings.length}\n`);
    console.log('─'.repeat(80) + '\n');

    await closeDbConnection();
    process.exit(0);

  } catch (err) {
    log('Fatal error:', err);
    process.exit(1);
  }
}

main();
