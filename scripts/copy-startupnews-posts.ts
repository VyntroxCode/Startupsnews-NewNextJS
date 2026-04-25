/**
 * Copy News Posts from Startup News (startupnews.fyi) to Zox Website
 * 
 * Features:
 * - Scrapes all posts from February 2026 to today
 * - Avoids duplicates by checking title and slug
 * - Maps posts to 12 sector categories (AI, Fintech, Social Media, Robotics, etc.)
 * - Downloads featured images and uploads to S3
 * - Downloads content images and uploads to S3
 * - Creates posts with full details (title, excerpt, content, images)
 * - Uses default admin user as author
 * - Sets all posts to "published" status
 * - Includes comprehensive logging and error handling
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
  getS3BaseUrl,
} from '../src/modules/rss-feeds/utils/image-to-s3';
import { extractImageUrlsFromHtml } from '../src/modules/rss-feeds/utils/content-extract';

loadEnvConfig(process.cwd());

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const SOURCE_DOMAIN = 'https://startupnews.fyi';
const NEWS_PAGE_URL = `${SOURCE_DOMAIN}/news`;
const FEBRUARY_CUTOFF = new Date('2026-02-01T00:00:00.000Z');
const BATCH_SIZE = 5;
const IMAGE_TIMEOUT_MS = 30000;
const MAX_IMAGE_RETRIES = 3;

// The 12 sector categories from admin panel
const SECTOR_CATEGORIES = [
  'ai-deeptech',
  'gaming',
  'fintech',
  'social-media',
  'robotics',
  'healthtech',
  'ev-mobility',
  'ecommerce',
  'saas-enterprise',
  'consumer-d2c',
  'web3-blockchain',
  'cybersecurity',
  'climate-energy',
];

// Keyword mapping for category matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'ai-deeptech': [
    'ai', 'artificial intelligence', 'deep tech', 'deeptech', 'machine learning',
    'neural network', 'gpt', 'llm', 'algorithm', 'transformer', 'nlp'
  ],
  'fintech': [
    'fintech', 'finance', 'bank', 'payment', 'lending', 'insurance', 'trading',
    'investment', 'wealth', 'trading', 'financial', 'bitcoin', 'ethereum'
  ],
  'social-media': [
    'social', 'twitter', 'facebook', 'instagram', 'tiktok', 'linkedin', 'creator',
    'influencer', 'community', 'messaging', 'platform', 'content creator'
  ],
  'gaming': [
    'gaming', 'game', 'esports', 'e-sports', 'xbox', 'playstation', 'nintendo',
    'steam', 'mobile game', 'pc game', 'game studio'
  ],
  'robotics': [
    'robot', 'automation', 'drone', 'hardware', 'manufacturing', 'assembly',
    'robotic', 'autonomous', 'mechanical'
  ],
  'healthtech': [
    'health', 'medical', 'pharma', 'biotech', 'wellness', 'fitness', 'doctor',
    'hospital', 'vaccine', 'drug', 'telemedicine', 'healthcare'
  ],
  'ev-mobility': [
    'electric', 'ev', 'vehicle', 'auto', 'car', 'transport', 'battery', 'charging',
    'mobility', 'vehicle', 'autonomous'
  ],
  'ecommerce': [
    'ecommerce', 'retail', 'shopping', 'marketplace', 'store', 'seller', 'vendor',
    'logistics', 'delivery', 'commerce', 'online store'
  ],
  'saas-enterprise': [
    'saas', 'enterprise', 'software', 'b2b', 'erp', 'crm', 'cloud', 'api',
    'devops', 'platform', 'infrastructure'
  ],
  'consumer-d2c': [
    'd2c', 'direct-to-consumer', 'consumer', 'brand', 'fmcg', 'fashion', 'food',
    'beverage', 'apparel', 'personal care'
  ],
  'web3-blockchain': [
    'web3', 'blockchain', 'nft', 'defi', 'smart contract', 'ethereum', 'dapp',
    'metaverse', 'crypto', 'token', 'web 3'
  ],
  'cybersecurity': [
    'security', 'cybersecurity', 'hack', 'encryption', 'data privacy', 'breach',
    'vulnerability', 'cyber', 'threat', 'protection'
  ],
  'climate-energy': [
    'climate', 'energy', 'green', 'renewable', 'solar', 'wind', 'carbon',
    'sustainability', 'environment', 'eco', 'climate tech'
  ],
};

// ============================================================================
// TYPES
// ============================================================================

interface ScrapedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImageUrl?: string;
  publishedAt: Date;
  sourceUrl: string;
}

interface User {
  id: number;
  email: string;
  name: string;
}

interface Category {
  id: number;
  slug: string;
  name: string;
}

// ============================================================================
// LOGGER
// ============================================================================

const log = {
  info: (msg: string, data?: any) => {
    console.log(`ℹ️  [INFO] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
  },
  success: (msg: string, count?: number) => {
    console.log(`✅ [SUCCESS] ${msg}${count !== undefined ? ` (${count})` : ''}`);
  },
  warn: (msg: string, data?: any) => {
    console.warn(`⚠️  [WARN] ${msg}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (msg: string, err?: any) => {
    console.error(`❌ [ERROR] ${msg}`, err ? (err.message || err) : '');
  },
  divider: () => console.log('─'.repeat(80)),
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate slug from title (lowercase, remove special chars, connect with hyphens)
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 200);
}

/**
 * Clean and normalize text
 */
function cleanText(text: string | null | undefined): string {
  return (text || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve relative URLs to absolute
 */
function toAbsoluteUrl(url: string, baseUrl: string = SOURCE_DOMAIN): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return trimmed;
  }
}

/**
 * Categorize post based on keywords in title, excerpt, and content
 */
function categorizePost(title: string, excerpt: string, content: string): string {
  const fullText = `${title} ${excerpt} ${content}`.toLowerCase();
  
  const scores = new Map<string, number>();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      // More weight for longer keywords (more specific matches)
      const matches = (fullText.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
      score += matches * keyword.length;
    }
    scores.set(category, score);
  }
  
  // Return highest scoring category
  let bestCategory = 'ai-deeptech'; // Default fallback
  let bestScore = 0;
  
  for (const [cat, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  
  return bestCategory;
}

/**
 * Download image with retry logic
 */
async function downloadImageWithRetry(url: string, retries = MAX_IMAGE_RETRIES): Promise<Buffer | null> {
  if (!url) return null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const buffer = await downloadImage(url);
      
      if (buffer && buffer.length > 0) {
        if (isValidFeaturedImage(buffer)) {
          return buffer;
        }
      }
    } catch (err) {
      log.warn(`Failed to download image (attempt ${attempt + 1}/${retries})`, { url, error: err });
      
      if (attempt < retries - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  return null;
}

/**
 * Upload image to S3 and return URL
 */
async function uploadImageToS3Bucket(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  
  try {
    // Skip if already our S3 URL
    if (isOurS3ImageUrl(imageUrl)) {
      return imageUrl;
    }

    if (!isS3Configured()) {
      log.warn('S3 not configured, using original URL', { imageUrl });
      return imageUrl;
    }

    const buffer = await downloadImageWithRetry(imageUrl);
    if (!buffer) {
      log.warn('Failed to download image after retries', { imageUrl });
      return null;
    }

    const key = s3KeyForAdminUpload(imageUrl);
    const contentType = getContentType(imageUrl);
    
    const s3Url = await uploadImageToS3(key, buffer, contentType);
    log.info('Image uploaded to S3', { original: imageUrl, s3Url });
    
    return s3Url;
  } catch (err) {
    log.error('Error uploading image to S3', err);
    return null;
  }
}

/**
 * Process all images in HTML content and upload to S3
 */
async function processHtmlImages(html: string): Promise<string> {
  if (!html || !isS3Configured()) return html;

  try {
    const imageUrls = extractImageUrlsFromHtml(html, '');
    let processedHtml = html;

    for (const url of imageUrls) {
      if (!url) continue;
      
      try {
        const s3Url = await uploadImageToS3Bucket(url);
        if (s3Url && s3Url !== url) {
          // Replace all occurrences of the URL
          processedHtml = processedHtml.split(url).join(s3Url);
        }
      } catch (err) {
        log.warn('Failed to process image in content', { url });
        // Continue with next image
      }
    }

    return processedHtml;
  } catch (err) {
    log.error('Error processing HTML images', err);
    return html;
  }
}

// ============================================================================
// SCRAPER FUNCTIONS
// ============================================================================

/**
 * Scrape all post listings from news page
 */
async function scrapePosts(): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];
  const seenUrls = new Set<string>();

  try {
    log.info('Starting to scrape posts from', { url: NEWS_PAGE_URL });

    const response = await fetch(NEWS_PAGE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${NEWS_PAGE_URL}: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find all post cards on the page
    const postCards = $('li.mvp-blog-story-wrap, article.post-card, div.post-item, a[href*="/post/"]')
      .toArray();

    log.info('Found post cards', { count: postCards.length });

    // Process each post card
    for (const card of postCards) {
      try {
        const $card = $(card);
        
        // Get post link
        let postLink = $card.find('a[href*="/post/"]').first().attr('href') || 
                      $card.attr('href') || 
                      $card.find('a').first().attr('href');
        
        if (!postLink) continue;

        const absoluteUrl = toAbsoluteUrl(postLink);
        
        // Skip if we've already seen this URL
        if (seenUrls.has(absoluteUrl)) continue;
        seenUrls.add(absoluteUrl);

        // Get title
        const title = cleanText(
          $card.find('h1, h2, h3, .post-title').first().text() ||
          $card.find('a').first().attr('title')
        );
        
        if (!title) continue;

        // Get excerpt
        const excerpt = cleanText(
          $card.find('.post-excerpt, p, .excerpt').first().text()
        ).slice(0, 500);

        // Get image
        const imageUrl = toAbsoluteUrl(
          $card.find('img').first().attr('src') || ''
        );

        // Add to array for later fetching details
        posts.push({
          title,
          slug: generateSlug(title),
          excerpt: excerpt || title,
          content: '',
          featuredImageUrl: imageUrl || undefined,
          publishedAt: new Date(),
          sourceUrl: absoluteUrl,
        });

        log.info('Found post in listing', { title, url: absoluteUrl });

      } catch (err) {
        log.warn('Error processing post card', err);
        continue;
      }
    }

    log.success('Scraped post listings', posts.length);

    // Now fetch detailed content for each post
    log.info('Fetching detailed content for each post...');
    const detailedPosts: ScrapedPost[] = [];

    for (let i = 0; i < posts.length; i++) {
      try {
        const post = posts[i];
        
        log.info(`Fetching post details (${i + 1}/${posts.length})`, { title: post.title });

        const response = await fetch(post.sourceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          log.warn('Failed to fetch post details', { status: response.status, url: post.sourceUrl });
          continue;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Get publish date
        let publishedAt = new Date();
        const dateStr = $('meta[property="article:published_time"]').attr('content') ||
                       $('time[datetime]').first().attr('datetime') ||
                       $('span.publish-date').first().text();
        
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!Number.isNaN(parsed.getTime())) {
            publishedAt = parsed;
          }
        }

        // Check if before February cutoff
        if (publishedAt < FEBRUARY_CUTOFF) {
          log.info('Reached February cutoff, stopping scrape', { title: post.title, date: publishedAt.toISOString() });
          break;
        }

        // Get full content
        let content = $('div.entry-content, article.post-content, div.post-body, main').html() || '';
        
        if (!content) {
          content = `<p>${post.excerpt}</p>`;
        }

        // Get meta description
        const metaTitle = cleanText($('meta[property="og:title"]').attr('content')) || post.title;
        const metaDesc = cleanText(
          $('meta[property="og:description"]').attr('content') ||
          $('meta[name="description"]').attr('content') ||
          post.excerpt
        );

        // Get featured image if not already set
        let featuredImage = post.featuredImageUrl;
        if (!featuredImage) {
          featuredImage = toAbsoluteUrl(
            $('meta[property="og:image"]').attr('content') ||
            $('img.featured-image').first().attr('src') ||
            $('article img').first().attr('src') ||
            ''
          );
        }

        detailedPosts.push({
          title: metaTitle || post.title,
          slug: generateSlug(metaTitle || post.title),
          excerpt: metaDesc || post.excerpt,
          content,
          featuredImageUrl: featuredImage || undefined,
          publishedAt,
          sourceUrl: post.sourceUrl,
        });

      } catch (err) {
        log.warn('Error fetching post details', err);
        continue;
      }

      // Small delay between requests
      if (i < posts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return detailedPosts;

  } catch (err) {
    log.error('Error scraping posts', err);
    return [];
  }
}

/**
 * Check if post already exists in database
 */
async function postExists(title: string, slug: string): Promise<boolean> {
  try {
    const bySlug = await queryOne<{ id: number }>(
      'SELECT id FROM posts WHERE slug = ? LIMIT 1',
      [slug]
    );
    
    if (bySlug) {
      return true;
    }

    const byTitle = await queryOne<{ id: number }>(
      'SELECT id FROM posts WHERE title = ? LIMIT 1',
      [title]
    );
    
    if (byTitle) {
      return true;
    }

    return false;
  } catch (err) {
    log.error('Error checking if post exists', err);
    return true; // Assume it exists to be safe
  }
}

/**
 * Get admin user
 */
async function getAdminUser(): Promise<User | null> {
  try {
    // Try to get admin user
    const admin = await queryOne<User>(
      'SELECT id, email, name FROM users WHERE role = ? ORDER BY id ASC LIMIT 1',
      ['admin']
    );
    
    if (admin) {
         log.info('Found admin user', { name: admin.name, email: admin.email });
      return admin;
    }

    // Try default admin email
    const defaultAdmin = await queryOne<User>(
      'SELECT id, email, name FROM users WHERE email = ? LIMIT 1',
      ['admin@startupnews.fyi']
    );

    if (defaultAdmin) {
      log.info('Found default admin', { name: defaultAdmin.name, email: defaultAdmin.email });
      return defaultAdmin;
    }

    return null;
  } catch (err) {
    log.error('Error getting admin user', err);
    return null;
  }
}

/**
 * Get category ID by slug
 */
async function getCategoryId(slug: string): Promise<number | null> {
  try {
    const result = await queryOne<{ id: number }>(
      'SELECT id FROM categories WHERE slug = ? LIMIT 1',
      [slug]
    );
    
    return result?.id || null;
  } catch (err) {
    log.warn('Error getting category ID', { slug, error: err });
    return null;
  }
}

/**
 * Create post in database
 */
async function createPost(
  post: ScrapedPost,
  categoryId: number,
  adminId: number
): Promise<number | null> {
  try {
    // Upload featured image to S3
    let s3ImageUrl: string | null = null;
    if (post.featuredImageUrl) {
      s3ImageUrl = await uploadImageToS3Bucket(post.featuredImageUrl);
    }

    // Process content images
    let processedContent = post.content;
    if (isS3Configured()) {
      processedContent = await processHtmlImages(post.content);
    }

    // Prepare data
    const title = post.title.slice(0, 255);
    const slug = generateSlug(post.title).slice(0, 255);
    const excerpt = post.excerpt.slice(0, 500);
    const metaDescription = excerpt.slice(0, 160);
    const publishedAt = post.publishedAt.toISOString().slice(0, 19).replace('T', ' ');

    // Insert post
    const result = await query(
      `INSERT INTO posts (
        title, slug, excerpt, meta_description, content, category_id, author_id,
        featured_image_url, featured_image_small_url, format, status, featured,
        published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title,
        slug,
        excerpt,
        metaDescription,
        processedContent,
        categoryId,
        adminId,
        s3ImageUrl || null,
        s3ImageUrl || null,
        'standard',
        'published',
        0, // not featured
        publishedAt,
      ]
    );

    // Verify insertion
    const check = await queryOne<{ id: number }>(
      'SELECT id FROM posts WHERE slug = ? AND title = ? LIMIT 1',
      [slug, title]
    );

    if (check?.id) {
      log.success('Post created', check.id);
      return check.id;
    }

    return null;
  } catch (err) {
    log.error('Error creating post', err);
    return null;
  }
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  log.divider();
  log.info('Starting Startup News Post Importer', {
    source: SOURCE_DOMAIN,
    fromDate: '2026-02-01',
    toDate: new Date().toISOString().split('T')[0],
  });
  log.divider();

  try {
    // Verify database connection
    log.info('Connecting to database...');
    const pool = await getDbConnection();
    log.success('Database connected');

    // Get admin user
    log.info('Getting admin user...');
    const admin = await getAdminUser();
    if (!admin) {
      throw new Error('No admin user found. Make sure to run db:seed first.');
    }

    // Load all categories
    log.info('Loading categories...');
    const categoryMap = new Map<string, number>();
    
    for (const slug of SECTOR_CATEGORIES) {
      const id = await getCategoryId(slug);
      if (id) {
        categoryMap.set(slug, id);
      } else {
        log.warn(`Category not found in database`, { slug });
      }
    }

    if (categoryMap.size === 0) {
      throw new Error('No sector categories found in database. Run db:seed first.');
    }

    log.success(`Categories loaded`, categoryMap.size);
    log.divider();

    // Scrape posts
    log.info('Scraping posts from website...');
    const scrapedPosts = await scrapePosts();
    
    if (scrapedPosts.length === 0) {
      log.warn('No posts scraped from website');
      await closeDbConnection();
      return;
    }

    log.divider();
    log.info(`Processing ${scrapedPosts.length} posts...`);
    log.divider();

    // Import posts
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < scrapedPosts.length; i++) {
      const post = scrapedPosts[i];
      const progress = `(${i + 1}/${scrapedPosts.length})`;

      try {
        log.info(`Processing post ${progress}`, { title: post.title });

        // Check for duplicates
        if (await postExists(post.title, post.slug)) {
          log.warn('Post already exists, skipping', { title: post.title });
          duplicateCount++;
          continue;
        }

        // Categorize post
        const category = categorizePost(post.title, post.excerpt, post.content);
        const categoryId = categoryMap.get(category);

        if (!categoryId) {
          log.error('Failed to find category', { category });
          errorCount++;
          continue;
        }

        // Create post
        const postId = await createPost(post, categoryId, admin.id);

        if (postId) {
          successCount++;
        } else {
          errorCount++;
        }

      } catch (err) {
        log.error(`Error processing post`, err);
        errorCount++;
      }

      // Small delay between posts
      if (i < scrapedPosts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_SIZE * 100));
      }
    }

    log.divider();
    log.success('Import Complete!');
    log.info('Summary', {
      successful: successCount,
      duplicates: duplicateCount,
      errors: errorCount,
      total: scrapedPosts.length,
    });
    log.divider();

    await closeDbConnection();
    process.exit(0);

  } catch (err) {
    log.error('Fatal error', err);
    await closeDbConnection().catch(() => {});
    process.exit(1);
  }
}

main();
