/**
 * Scrape posts from https://startupnews.thebackend.in/ - fetch all available posts
 * 
 * Features:
 * - Fetches all posts from the listing page
 * - Detects duplicates (by URL and title) to avoid copying existing posts
 * - Uses default admin user for author_id
 * - Maps posts to one of the 12 sector categories
 * - Downloads images and uploads to S3
 * - Creates posts with full details (like manual posts)
 * - Posts are marked as 'published' status
 * - Stores source URL for tracking
 */

import { loadEnvConfig } from '@next/env';
import * as cheerio from 'cheerio';
import { getDbConnection, closeDbConnection, query, queryOne } from '../src/shared/database/connection';
import {
  downloadImage,
  isValidFeaturedImage,
  uploadImageToS3,
  s3KeyForManualPostImage,
  getContentType,
  isS3Configured,
  isOurS3ImageUrl,
} from '../src/modules/rss-feeds/utils/image-to-s3';
import { extractImageUrlsFromHtml } from '../src/modules/rss-feeds/utils/content-extract';

loadEnvConfig(process.cwd());

// ============================================================================
// CONFIGURATION
// ============================================================================

const SOURCE_URL = 'https://startupnews.fyi';
const SOURCE_LIST_URL = `${SOURCE_URL}/news`;
const SOURCE_CANONICAL_BASE = 'https://startupnews.thebackend.in';
const BATCH_SIZE = 50;           // Process posts in batches
const IMAGE_TIMEOUT_MS = 30000;  // 30 seconds per image download
const MAX_RETRIES = 3;           // Retry failed image downloads
const IMPORT_FROM_DATE = process.env.IMPORT_FROM_DATE || '2026-03-01T00:00:00.000Z';
const IMPORT_START_CUTOFF = new Date(IMPORT_FROM_DATE); // Default: March 1, 2026

// The 12 sector categories (from SECTOR_CATEGORY_SLUGS in lib/sector-categories.ts)
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

const CATEGORY_ALIASES: Record<string, string[]> = {
  'ai-deeptech': ['ai & deeptech', 'ai', 'artificial intelligence', 'deeptech', 'deep tech'],
  'fintech': ['fintech', 'finance', 'financial', 'payments', 'banking'],
  'social-media': ['social media', 'social', 'creator', 'influencer', 'community'],
  'gaming': ['gaming', 'game', 'esports', 'e-sports', 'xbox', 'playstation', 'nintendo', 'steam'],
  'robotics': ['robotics', 'robot', 'automation', 'hardware'],
  'healthtech': ['healthtech', 'health', 'medical', 'biotech', 'wellness'],
  'ev-mobility': ['mobility & ev', 'ev', 'mobility', 'electric vehicle', 'transport'],
  'ecommerce': ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'commerce'],
  'saas-enterprise': ['saas', 'enterprise', 'b2b', 'software', 'cloud'],
  'consumer-d2c': ['consumer d2c', 'd2c', 'consumer', 'direct-to-consumer'],
  'web3-blockchain': ['web3', 'blockchain', 'nft', 'defi', 'crypto'],
  'cybersecurity': ['cybersecurity', 'cyber security', 'security', 'privacy'],
  'climate-energy': ['climate', 'energy', 'sustainability', 'renewable', 'green'],
};

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ScrapedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  publishedAt: Date;
  sourceUrl: string;
  categories: string[]; // Keywords/tags to help categorize
}

interface PostCategory {
  id: number;
  slug: string;
  name: string;
}

interface ListingPost {
  title: string;
  excerpt: string;
  categoryLabel: string;
  sourceUrl: string;
  fetchUrl: string;
  imageUrl?: string;
}

interface User {
  id: number;
  email: string;
  name: string;
}

// ============================================================================
// LOGGER
// ============================================================================

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => {
    console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : '');
  },
  warn: (msg: string, data?: Record<string, unknown>) => {
    console.warn(`[WARN] ${msg}`, data ? JSON.stringify(data) : '');
  },
  error: (msg: string, err?: unknown) => {
    console.error(`[ERROR] ${msg}`, err);
  },
  success: (msg: string, count?: number) => {
    console.log(`✓ ${msg}${count ? ` (${count})` : ''}`);
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate slug from title (same as frontend)
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

function absoluteUrl(url: string, baseUrl: string = SOURCE_URL): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return new URL(trimmed, baseUrl).toString();
}

function canonicalizeSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${SOURCE_CANONICAL_BASE}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function normalizeText(value: string | undefined | null): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function extractFirstText(root: any, selectors: string[]): string {
  for (const selector of selectors) {
    const text = normalizeText(root.find(selector).first().text());
    if (text) return text;
  }
  return '';
}

function extractFirstAttr(root: any, selectors: string[], attr: string): string {
  for (const selector of selectors) {
    const value = root.find(selector).first().attr(attr);
    if (value && normalizeText(value)) return normalizeText(value);
  }
  return '';
}

function parseRelativeTime(label: string): Date | null {
  const text = normalizeText(label).toLowerCase();
  if (!text) return null;
  const now = new Date();
  const amount = parseInt(text, 10);
  if (Number.isNaN(amount)) return null;
  if (text.includes('minute')) return new Date(now.getTime() - amount * 60 * 1000);
  if (text.includes('hour')) return new Date(now.getTime() - amount * 60 * 60 * 1000);
  if (text.includes('day')) return new Date(now.getTime() - amount * 24 * 60 * 60 * 1000);
  if (text.includes('week')) return new Date(now.getTime() - amount * 7 * 24 * 60 * 60 * 1000);
  if (text.includes('month')) return new Date(now.getFullYear(), now.getMonth() - amount, now.getDate());
  return null;
}

function mapSourceCategoryToSector(label: string, title = '', excerpt = ''): string {
  const haystack = `${label} ${title} ${excerpt}`.toLowerCase();
  for (const [slug, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => haystack.includes(alias))) {
      return slug;
    }
  }
  return categorizePost(title, excerpt, label);
}

/**
 * Check if a post already exists by slug or title (to avoid duplicates)
 */
async function postExists(sourceUrl: string, title: string): Promise<boolean> {
  const slug = generateSlug(title);

  // Check by slug first because that's the unique field we store
  const bySlug = await queryOne<{ id: number }>(
    'SELECT id FROM posts WHERE slug = ? LIMIT 1',
    [slug]
  );
  if (bySlug) {
    logger.warn('Post already exists by slug', { slug, sourceUrl });
    return true;
  }

  // Check by title as a second guard
  const byTitle = await queryOne<{ id: number }>(
    'SELECT id FROM posts WHERE title = ? LIMIT 1',
    [title.trim()]
  );
  if (byTitle) {
    logger.warn('Post already exists by title', { title });
    return true;
  }

  return false;
}

/**
 * Find best matching category based on keywords
 */
function categorizePost(title: string, excerpt: string, contentText: string): string {
  const fullText = `${title} ${excerpt} ${contentText}`.toLowerCase();

  // Category keyword mappings
  const categoryKeywords: Record<string, string[]> = {
    'ai-deeptech': ['ai', 'artificial intelligence', 'deep tech', 'deeptech', 'machine learning', 'neural', 'gpt', 'llm', 'algorithm'],
    'fintech': ['fintech', 'finance', 'bank', 'payment', 'crypto', 'bitcoin', 'blockchain', 'lending', 'insurance'],
    'social-media': ['social', 'twitter', 'facebook', 'instagram', 'tiktok', 'linkedin', 'content creator', 'influencer', 'community'],
    'gaming': ['gaming', 'game', 'esports', 'e-sports', 'xbox', 'playstation', 'nintendo', 'steam'],
    'robotics': ['robot', 'automation', 'drone', 'hardware', 'manufacturing', 'assembly'],
    'healthtech': ['health', 'medical', 'pharma', 'biotech', 'wellness', 'fitness', 'doctor', 'hospital', 'vaccine', 'drug'],
    'ev-mobility': ['electric', 'ev', 'vehicle', 'auto', 'car', 'transport', 'battery', 'charging', 'mobility'],
    'ecommerce': ['ecommerce', 'retail', 'shopping', 'marketplace', 'store', 'seller', 'vendor', 'logistics', 'delivery'],
    'saas-enterprise': ['saas', 'enterprise', 'software', 'b2b', 'erp', 'crm', 'cloud', 'api', 'devops'],
    'consumer-d2c': ['d2c', 'direct-to-consumer', 'consumer', 'brand', 'fmcg', 'fashion', 'food'],
    'web3-blockchain': ['web3', 'blockchain', 'nft', 'defi', 'smart contract', 'ethereum', 'dapp', 'metaverse'],
    'cybersecurity': ['security', 'cybersecurity', 'hack', 'encryption', 'data privacy', 'breach', 'vulnerability'],
    'climate-energy': ['climate', 'energy', 'green', 'renewable', 'solar', 'wind', 'carbon', 'sustainability', 'environment'],
  };

  // Score each category
  const scores = new Map<string, number>();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (fullText.includes(keyword)) {
        score += keyword.length; // Longer matches weighted more
      }
    }
    scores.set(category, score);
  }

  // Return highest scoring category, default to ai-deeptech
  let bestCategory = 'ai-deeptech';
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
async function downloadImageWithRetry(url: string, retries = MAX_RETRIES): Promise<Buffer | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const buffer = await downloadImage(url);
      if (buffer && isValidFeaturedImage(buffer)) {
        return buffer;
      }
    } catch (err) {
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Backoff
      }
    }
  }
  return null;
}

/**
 * Upload image to S3
 */
async function uploadImageAndGetUrl(url: string): Promise<string | null> {
  try {
    if (isOurS3ImageUrl(url)) {
      return url;
    }
    if (!isS3Configured()) {
      logger.warn('S3 not configured - using original image URL');
      return url;
    }

    const buffer = await downloadImageWithRetry(url);
    if (!buffer) {
      logger.warn('Failed to download image', { url });
      return null;
    }

    const key = s3KeyForManualPostImage(url);
    const contentType = getContentType(url);
    const s3Url = await uploadImageToS3(key, buffer, contentType);

    logger.info('Image uploaded to S3', { originalUrl: url, s3Url });
    return s3Url;
  } catch (err) {
    logger.error('Error uploading image to S3', err);
    return null;
  }
}

/**
 * Process images in HTML content: download and upload to S3
 */
async function processContentImages(content: string): Promise<string> {
  if (!isS3Configured() || !content) return content;

  try {
    const imageUrls = extractImageUrlsFromHtml(content, '');
    const urlMap = new Map<string, string>();

    for (const imgUrl of imageUrls) {
      if (urlMap.has(imgUrl)) continue; // Already processed

      try {
        const s3Url = await uploadImageAndGetUrl(imgUrl);
        if (s3Url) {
          urlMap.set(imgUrl, s3Url);
        }
      } catch (err) {
        logger.warn('Failed to process image in content', { imgUrl });
        // Continue with original URL
      }
    }

    // Replace URLs in content
    let processedContent = content;
    for (const [originalUrl, s3Url] of urlMap) {
      processedContent = processedContent.split(originalUrl).join(s3Url);
    }

    return processedContent;
  } catch (err) {
    logger.error('Error processing content images', err);
    return content; // Return original on error
  }
}

// ============================================================================
// SCRAPER (TO BE IMPLEMENTED BY USER)
// ============================================================================

/**
 * Scrape posts from the website
 * This is the main scraping logic that needs to be customized for the specific website structure
 */
async function scrapePosts(): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];
  
  try {
    const seenUrls = new Set<string>();
    const listingPosts: ListingPost[] = [];

    const listingPageUrls = [
      SOURCE_LIST_URL,
      ...SECTOR_CATEGORIES.map((slug) => `${SOURCE_URL}/category/${slug}`),
      `${SOURCE_URL}/category/cyber-security`,
    ];

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
    };

    async function collectListingPostsFromPage(pageUrl: string): Promise<void> {
      const pageResponse = await fetch(pageUrl, { headers: fetchHeaders });
      if (!pageResponse.ok) {
        logger.warn('Skipping listing page because it failed to load', { pageUrl, status: pageResponse.status });
        return;
      }

      const pageHtml = await pageResponse.text();
      const page$ = cheerio.load(pageHtml);

      const addCard = (card: any, fallbackCategoryLabel = '') => {
        const link = card.find('a[href*="/post/"]').first().attr('href') ?? '';
        if (!link) return;

        const sourceUrl = canonicalizeSourceUrl(absoluteUrl(link, SOURCE_URL));
        if (seenUrls.has(sourceUrl)) return;

        const title = extractFirstText(card, ['h1', 'h2', 'h3']);
        if (!title) return;

        seenUrls.add(sourceUrl);
        const excerpt = extractFirstText(card, ['.post-card-excerpt-max-3-lines', 'p']);
        const categoryLabel = extractFirstText(card, ['.mvp-cd-cat']) || fallbackCategoryLabel;
        const imageUrl = extractFirstAttr(card, ['img'], 'src');

        listingPosts.push({
          title,
          excerpt,
          categoryLabel,
          sourceUrl,
          fetchUrl: absoluteUrl(link, SOURCE_URL),
          imageUrl: imageUrl ? absoluteUrl(imageUrl, SOURCE_URL) : undefined,
        });
      };

      page$('a.sector-hero-link').each((_, element) => {
        const hero = page$(element);
        const href = hero.attr('href') ?? '';
        if (!href) return;
        const title = extractFirstText(hero, ['.sector-hero-title', 'h1', 'h2']);
        if (!title) return;
        const sourceUrl = canonicalizeSourceUrl(absoluteUrl(href, SOURCE_URL));
        if (seenUrls.has(sourceUrl)) return;
        seenUrls.add(sourceUrl);

        const categoryLabel = extractFirstText(hero, ['.sector-hero-tag', '.mvp-cd-cat', '.mvp-cd-cat-left']);
        const excerpt = extractFirstText(hero, ['p']);
        const imageUrl = extractFirstAttr(hero, ['img'], 'src');

        listingPosts.push({
          title,
          excerpt,
          categoryLabel,
          sourceUrl,
          fetchUrl: absoluteUrl(href, SOURCE_URL),
          imageUrl: imageUrl ? absoluteUrl(imageUrl, SOURCE_URL) : undefined,
        });
      });

      page$('li.mvp-blog-story-wrap.infinite-post').each((_, element) => {
        const card = page$(element);
        addCard(card);
      });
    }

    logger.info('Starting scrape from', { urls: listingPageUrls.length });

    for (const pageUrl of listingPageUrls) {
      await collectListingPostsFromPage(pageUrl);
    }

    logger.info('Listing posts found', { count: listingPosts.length });

    for (const listing of listingPosts) {
      const detailResponse = await fetch(listing.fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        },
      });

      if (!detailResponse.ok) {
        logger.warn('Skipping post because detail page failed to load', { sourceUrl: listing.sourceUrl, status: detailResponse.status });
        continue;
      }

      const detailHtml = await detailResponse.text();
      const detail$ = cheerio.load(detailHtml);

      const title = normalizeText(detail$('meta[property="og:title"]').attr('content') || detail$('h1.mvp-post-title').first().text() || listing.title);
      const excerpt = normalizeText(
        detail$('meta[property="og:description"]').attr('content') ||
        detail$('meta[name="description"]').attr('content') ||
        listing.excerpt ||
        detail$('div.entry-content p').first().text()
      );

      const publishedTimeRaw = detail$('meta[property="article:published_time"]').attr('content') || detail$('time[datetime]').first().attr('datetime') || '';
      const publishedAt = publishedTimeRaw ? new Date(publishedTimeRaw) : (parseRelativeTime(extractFirstText(detail$('body'), ['.startupnews-date', '.startupnews-mobile-featured-time'])) || new Date());

      if (Number.isNaN(publishedAt.getTime())) {
        logger.warn('Skipping post with invalid publish date', { sourceUrl: listing.sourceUrl, title });
        continue;
      }

      if (publishedAt < IMPORT_START_CUTOFF) {
        logger.info('Reached import start cutoff, stopping scrape', { title, publishedAt: publishedAt.toISOString(), cutoff: IMPORT_START_CUTOFF.toISOString() });
        break;
      }

      const contentRoot = detail$('div.entry-content.wp-block-post-content').first();
      let content = contentRoot.html() || '';
      if (!content) {
        const articleRoot = detail$('article').first();
        content = articleRoot.html() || '';
      }
      if (!content) {
        content = `<p>${excerpt || title}</p>`;
      }

      const sectionLabel = normalizeText(detail$('meta[property="article:section"]').attr('content') || listing.categoryLabel || '');
      const imageUrl = absoluteUrl(
        detail$('meta[property="og:image"]').attr('content') ||
        listing.imageUrl ||
        extractFirstAttr(contentRoot, ['img'], 'src') ||
        extractFirstAttr(detail$('article'), ['img'], 'src') ||
        '',
        SOURCE_URL
      );

      const canonicalSourceUrl = canonicalizeSourceUrl(detail$('meta[property="og:url"]').attr('content') || listing.sourceUrl);
      const finalExcerpt = excerpt || title;
      const postCategory = mapSourceCategoryToSector(sectionLabel, title, finalExcerpt);

      posts.push({
        title,
        slug: generateSlug(title),
        excerpt: finalExcerpt.slice(0, 500),
        content,
        imageUrl: imageUrl || undefined,
        publishedAt,
        sourceUrl: canonicalSourceUrl,
        categories: [postCategory],
      });
    }

    posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    logger.success('Scraping completed', posts.length);
    
  } catch (err) {
    logger.error('Error scraping website', err);
  }

  return posts;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Get admin user (default admin created during seed)
 */
async function getAdminUser(): Promise<User | null> {
  // Try to get the admin user created during seeding
  const admin = await queryOne<User>(
    'SELECT id, email, name FROM users WHERE role = ? ORDER BY id ASC LIMIT 1',
    ['admin']
  );
  
  if (admin) {
    logger.info('Found admin user', { email: admin.email, id: admin.id });
    return admin;
  }

  // Fallback: try the default admin email
  const defaultAdmin = await queryOne<User>(
    'SELECT id, email, name FROM users WHERE email = ? LIMIT 1',
    [process.env.ADMIN_EMAIL || 'admin@startupnews.fyi']
  );

  if (defaultAdmin) {
    logger.info('Found default admin', { email: defaultAdmin.email, id: defaultAdmin.id });
    return defaultAdmin;
  }

  throw new Error('No admin user found in database. Run npm run db:seed first.');
}

/**
 * Get category ID by slug
 */
async function getCategoryIdBySlug(slug: string): Promise<number | null> {
  const category = await queryOne<PostCategory>(
    'SELECT id FROM categories WHERE slug = ? LIMIT 1',
    [slug]
  );
  if (category?.id) return category.id;
  if (slug === 'cybersecurity') {
    const fallback = await queryOne<PostCategory>(
      'SELECT id FROM categories WHERE slug = ? LIMIT 1',
      ['cyber-security']
    );
    return fallback?.id ?? null;
  }
  return null;
}

/**
 * Create a post in the database
 */
async function createPost(
  post: ScrapedPost,
  categoryId: number,
  adminId: number
): Promise<number | null> {
  try {
    const slug = generateSlug(post.title);
    
    // Skip if already exists
    if (await postExists(post.sourceUrl, post.title)) {
      return null;
    }

    const result = await query(
      `INSERT INTO posts (
        title, slug, excerpt, meta_description, content, category_id, author_id,
        featured_image_url, featured_image_small_url, format, status, featured, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        post.title.slice(0, 255),
        slug.slice(0, 255),
        post.excerpt.slice(0, 500),
        post.excerpt.slice(0, 160),
        post.content,
        categoryId,
        adminId,
        post.imageUrl || null,
        post.imageUrl || null,
        'standard',
        'published',
        1,
        new Date(post.publishedAt).toISOString().slice(0, 19).replace('T', ' '),
      ]
    );

    // Get inserted ID
    const checkResult = await queryOne<{ id: number }>(
      'SELECT id FROM posts WHERE slug = ? LIMIT 1',
      [slug]
    );

    if (checkResult?.id) {
      logger.success('Post created', checkResult.id);
      return checkResult.id;
    }

    return null;
  } catch (err) {
    logger.error('Error creating post', err);
    return null;
  }
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  try {
    logger.info('Starting StartupNews scraper', { 
      source: SOURCE_URL,
      startDate: IMPORT_START_CUTOFF.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });

    // Verify database connection
    const pool = await getDbConnection();
    logger.info('Database connected');

    // Get admin user
    const admin = await getAdminUser();
    if (!admin) {
      throw new Error('Failed to get admin user');
    }

    // Get all sector categories (cache them)
    const categoryMap = new Map<string, number>();
    for (const slug of SECTOR_CATEGORIES) {
      const idOrNull = await getCategoryIdBySlug(slug);
      if (idOrNull) {
        categoryMap.set(slug, idOrNull);
      } else {
        logger.warn('Category not found in database', { slug });
      }
    }

    if (categoryMap.size === 0) {
      throw new Error('No sector categories found. Make sure to run npm run db:seed first.');
    }

    logger.success('Categories loaded', categoryMap.size);

    // Scrape posts
    logger.info('Scraping posts...');
    const scrapedPosts = await scrapePosts();
    logger.info('Posts scraped', { count: scrapedPosts.length });

    if (scrapedPosts.length === 0) {
      logger.warn('No posts found to import');
      await closeDbConnection();
      return;
    }

    // Process posts in batches
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (let i = 0; i < scrapedPosts.length; i += BATCH_SIZE) {
      const batch = scrapedPosts.slice(i, i + BATCH_SIZE);
      logger.info(`Processing batch ${Math.ceil((i + 1) / BATCH_SIZE)} of ${Math.ceil(scrapedPosts.length / BATCH_SIZE)}`);

      for (const post of batch) {
        try {
          // Skip if duplicate
          if (await postExists(post.sourceUrl, post.title)) {
            duplicateCount++;
            continue;
          }

          // Categorize post
          const category = categorizePost(post.title, post.excerpt, post.content);
          const categoryId = categoryMap.get(category);

          if (!categoryId) {
            logger.warn('Failed to find category', { category });
            errorCount++;
            continue;
          }

          // Upload featured image to S3
          let featuredImageUrl: string | undefined;
          if (post.imageUrl) {
            featuredImageUrl = (await uploadImageAndGetUrl(post.imageUrl)) || undefined;
          }

          // Process content images
          let processedContent = post.content;
          if (isS3Configured()) {
            processedContent = await processContentImages(post.content);
          }

          // Create post
          const postId = await createPost(
            {
              ...post,
              imageUrl: featuredImageUrl,
              content: processedContent
            },
            categoryId,
            admin.id
          );

          if (postId) {
            successCount++;
          } else {
            duplicateCount++;
          }
        } catch (err) {
          logger.error('Error processing post', err);
          errorCount++;
        }
      }

      // Small delay between batches to avoid overwhelming the system
      if (i + BATCH_SIZE < scrapedPosts.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.success('\nImport Summary');
    logger.info('Posts imported', { successful: successCount, duplicates: duplicateCount, errors: errorCount });

    await closeDbConnection();
  } catch (err) {
    logger.error('Fatal error', err);
    process.exit(1);
  }
}

main().then(() => {
  logger.success('Scraper finished successfully');
  process.exit(0);
}).catch(err => {
  logger.error('Scraper failed', err);
  process.exit(1);
});
