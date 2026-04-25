# Web Scraper Implementation Guide for StartupNews Posts

**Date:** April 3, 2026  
**Purpose:** Scrape posts from https://startupnews.thebackend.in/ without creating duplicates  
**Script Location:** `scripts/scrape-startupnews-posts.ts`

---

## 📋 Overview

This guide explains how to implement a web scraper that:
- ✅ Fetches all news posts from February 2026 to today
- ✅ Avoids creating duplicate posts (smart detection)
- ✅ Uses the default admin user as author
- ✅ Automatically categorizes posts into 12 sector categories
- ✅ Downloads and uploads images to AWS S3
- ✅ Creates posts with all required fields (title, slug, excerpt, content, images, etc.)
- ✅ Marks posts as "published" with source tracking

---

## 🏗️ Architecture

### Script Flow

```
1. Connect to Database
   ↓
2. Get Admin User (from users table)
   ↓
3. Load 12 Sector Categories (from categories table)
   ↓
4. Scrape Website
   ├─ Fetch HTML pages
   ├─ Parse with Cheerio
   ├─ Extract post details (title, content, images, date)
   └─ Return ScrapedPost[] array
   ↓
5. Process Posts (in batches of 50)
   ├─ Check for duplicates (by URL + title)
   ├─ Auto-categorize (keyword matching)
   ├─ Upload images to S3
   ├─ Process content images
   └─ Insert into database
   ↓
6. Generate Report
   ├─ Successful imports
   ├─ Duplicates skipped
   └─ Errors encountered
```

### Key Components

#### 1. **Database Layer**
- Validates admin user exists
- Gets category IDs for all 12 sectors
- Checks for duplicate posts (by external_source_url and title)
- Inserts posts with full details

#### 2. **Image Handling**
- Downloads images from source website
- Validates image dimensions (minimum 200x200px)
- Validates file size (minimum 2KB)
- Uploads to AWS S3 bucket (`startupnews-media-2026`)
- Stores S3 URL in posts table

#### 3. **Content Processing**
- Extracts all images from HTML content
- Downloads each image
- Uploads to S3
- Replaces original URLs with S3 URLs

#### 4. **Smart Categorization**
- Keyword-based matching against 12 categories
- Higher weight for longer matches
- Falls back to 'ai-deeptech' if no match found

#### 5. **Duplicate Detection**
- Checks `external_source_url` field
- Checks `title` field
- Prevents re-importing the same articles

---

## 📦 The 12 Sector Categories

The script uses these exact categories (from admin panel):

```typescript
const SECTOR_CATEGORIES = [
  'ai-deeptech',           // AI, deep tech, machine learning
  'fintech',               // Finance, banking, payments, crypto
  'social-media',          // Social networks, creators, influencers
  'robotics',              // Automation, drones, hardware
  'healthtech',            // Medical, biotech, wellness
  'ev-mobility',           // Electric vehicles, transportation
  'ecommerce',             // Online retail, logistics, delivery
  'saas-enterprise',       // B2B software, ERP, cloud
  'consumer-d2c',          // Direct-to-consumer brands
  'web3-blockchain',       // Blockchain, NFTs, DeFi, Web3
  'cybersecurity',         // Security, encryption, privacy
  'climate-energy',        // Green tech, renewable energy
];
```

**Each post is automatically categorized using keyword extraction** from title, excerpt, and content.

---

## 🔧 Implementation Steps

### Step 1: Install Dependencies

The script requires Cheerio for HTML parsing:

```bash
npm install cheerio
npm install --save-dev @types/cheerio
```

### Step 2: Implement the Scraper Function

The main scraping logic is in the `scrapePosts()` function. Here's how to implement it:

```typescript
async function scrapePosts(): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];
  
  try {
    logger.info('Starting scrape from', { url: SOURCE_URL });

    // Step 1: Fetch the main page
    const response = await fetch(SOURCE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Step 2: Find all post containers
    // NOTE: You need to inspect the website structure and adjust selectors
    // Common patterns: article, .post, .article-item, [data-post-id], etc.
    const articles = $('article, .post-item, .article-card');

    logger.info('Found article elements', { count: articles.length });

    // Step 3: Extract post details from each article
    articles.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title
        const title = $el.find('h2, h3, .post-title').first().text().trim();
        if (!title) {
          logger.warn('Skipping article with no title', { index });
          return; // Skip this article
        }

        // Extract excerpt/summary
        const excerpt = $el.find('p, .excerpt, .summary').first().text().trim();
        if (!excerpt) {
          logger.warn('Skipping article with no excerpt', { title });
          return;
        }

        // Extract article URL
        const postUrl = $el.find('a').attr('href') || '';
        if (!postUrl) {
          logger.warn('Skipping article with no link', { title });
          return;
        }

        // Make absolute URL if relative
        const sourceUrl = postUrl.startsWith('http') 
          ? postUrl 
          : new URL(postUrl, SOURCE_URL).toString();

        // Extract featured image
        const imageUrl = $el.find('img').attr('src');

        // Extract publish date
        let publishedAt = new Date();
        const dateStr = $el.find('time, .date, .published').attr('datetime') ||
                       $el.find('time, .date, .published').text();
        if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            publishedAt = parsed;
          }
        }

        // Filter by date (February onwards)
        const februaryStart = new Date(2026, 1, 1); // February 1, 2026
        if (publishedAt < februaryStart) {
          logger.warn('Skipping article before February', { title, date: publishedAt.toISOString() });
          return;
        }

        // Get full article content (or fetch from detail page)
        let content = $el.find('.content, .post-content').html() || '';
        
        // If content is empty, fetch from detail page
        if (!content || content.length < 100) {
          // This will be done asynchronously after initial collection
          logger.info('Content too short, will fetch from detail page', { title });
        }

        posts.push({
          title: title.slice(0, 255),
          slug: generateSlug(title),
          excerpt: excerpt.slice(0, 500),
          content: content || excerpt,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, SOURCE_URL).toString()) : undefined,
          publishedAt,
          sourceUrl,
          categories: [], // Used by auto-categorization
        });

        logger.info('Post extracted', { title: title.slice(0, 50), index });
      } catch (err) {
        logger.warn('Error extracting article', err);
      }
    });

    // Step 4: Fetch full content for each post (optional)
    // If the listing page doesn't have full content, fetch each detail page
    for (let i = 0; i < posts.length; i++) {
      try {
        const post = posts[i];
        if (post.content.length < 200) {
          logger.info(`[${i + 1}/${posts.length}] Fetching full content from detail page`, { title: post.title });
          
          const detailResponse = await fetch(post.sourceUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });

          if (detailResponse.ok) {
            const detailHtml = await detailResponse.text();
            const $detail = cheerio.load(detailHtml);

            // Extract full article content
            const fullContent = $detail.find('article, .post-content, .article-body').html() || post.content;
            posts[i].content = fullContent.slice(0, 50000); // Limit to 50KB

            logger.info('Full content fetched', { title: post.title.slice(0, 40) });
          }
        }
      } catch (err) {
        logger.warn('Failed to fetch detail page', err);
      }
    }

    logger.success('Scraping completed', posts.length);
    return posts;

  } catch (err) {
    logger.error('Error scraping website', err);
    return [];
  }
}
```

### Step 3: Customize Selectors for Your Target Website

The selectors in the code above are examples. **You need to inspect the actual website** and adjust them:

1. **Open the website** in your browser
2. **Open DevTools** (F12)
3. **Right-click on a post** → "Inspect"
4. **Find the HTML structure**, e.g.:
   ```html
   <article class="news-item">
     <h2 class="news-title">Post Title</h2>
     <p class="news-excerpt">Summary...</p>
     <a href="/post/slug">Read More</a>
     <img src="/images/post.jpg" alt="...">
     <time datetime="2026-02-15">Feb 15</time>
   </article>
   ```
5. **Update the selectors** in `scrapePosts()`:
   ```typescript
   const articles = $('article.news-item');  // Your selector
   const title = $el.find('h2.news-title').text();  // Your selector
   const excerpt = $el.find('p.news-excerpt').text();  // Your selector
   // ... etc
   ```

---

## 🚀 Running the Script

### Prerequisites

```bash
# Ensure database is running
docker-compose up -d mariadb redis

# Ensure .env.local is configured
cat .env.local | grep "^DB_\|^AWS_\|^S3_"

# Ensure database is migrated
npm run db:migrate
npm run db:seed
```

### Execute the Script

```bash
# Run the scraper
npm run scrape-startupnews

# OR directly with tsx
npx tsx scripts/scrape-startupnews-posts.ts

# OR with logging
DEBUG=*:* npx tsx scripts/scrape-startupnews-posts.ts
```

### Example Output

```
[INFO] Starting StartupNews scraper {
  source: "https://startupnews.thebackend.in/",
  startDate: "February 2026",
  endDate: "2026-04-03"
}
[INFO] Database connected
[INFO] Found admin user { email: "admin@startupnews.fyi", id: 1 }
✓ Categories loaded (12)
[INFO] Scraping posts...
[INFO] Found article elements { count: 342 }
[INFO] Posts extracted { title: "AI Startup Raises $10M Series A", index: 0 }
...
[INFO] Processing batch 1 of 7
[INFO] Image uploaded to S3 { originalUrl: "...", s3Url: "https://startupnews-media-2026.s3.amazonaws.com/..." }
✓ Post created (42)
...
✓ Import Summary
[INFO] Posts imported { successful: 234, duplicates: 45, errors: 8 }
✓ Scraper finished successfully
```

---

## 📊 Post Creation Details

### Fields Automatically Populated

| Field | Source | Example |
|-------|--------|---------|
| `title` | Article title | "AI Startup Raises $10M Series A" |
| `slug` | Generated from title | "ai-startup-raises-10m-series-a" |
| `excerpt` | Article summary | "A new AI startup announced..." |
| `content` | Full article HTML | `<p>Full article...</p>` |
| `featured_image_url` | Downloaded and uploaded to S3 | "https://startupnews-media-2026.s3.amazonaws.com/..." |
| `featured_image_small_url` | Same as featured_image_url | (same URL) |
| `category_id` | Auto-matched from 12 categories | 3 (for 'ai-deeptech') |
| `author_id` | Default admin user | 1 |
| `status` | Always 'published' | 'published' |
| `external_source_url` | Original article URL | "https://startupnews.thebackend.in/post/..." |
| `created_from` | Sourced externally | 'manual' |
| `published_at` | Extracted from article metadata | '2026-02-15 10:30:00' |

### Example Post Structure (in Database)

```sql
INSERT INTO posts (
  title, slug, excerpt, content, featured_image_url,
  featured_image_small_url, category_id, author_id, status,
  external_source_url, created_from, published_at, created_at, updated_at
) VALUES (
  'AI Startup Raises Series A Funding',
  'ai-startup-raises-series-a-funding',
  'A promising AI startup has secured $10 million in Series A funding...',
  '<p>Full article content with <img src="https://s3.../img.jpg"> images...</p>',
  'https://startupnews-media-2026.s3.amazonaws.com/uploads/2026/04/admin-123456-789.jpg',
  'https://startupnews-media-2026.s3.amazonaws.com/uploads/2026/04/admin-123456-789.jpg',
  1,  -- category_id for 'ai-deeptech'
  1,  -- author_id (default admin)
  'published',
  'https://startupnews.thebackend.in/post/ai-startup-raises-series-a',
  'manual',
  '2026-02-15 10:30:00',
  NOW(),
  NOW()
);
```

---

## 🔍 Duplicate Detection

The script prevents duplicates by checking:

### 1. By External Source URL
```sql
SELECT id FROM posts 
WHERE external_source_url = 'https://startupnews.thebackend.in/post/...'
```

**Prevents re-scraping the same article multiple times**

### 2. By Title
```sql
SELECT id FROM posts 
WHERE title = 'AI Startup Raises Series A Funding'
```

**Catches articles with same title but different URLs**

### Results
- ✅ **Skips duplicates** without re-creating them
- ✅ **Logs duplicates** for review
- ✅ **No manual de-duplication needed**

---

## 🖼️ Image Handling

### Image Download & Upload Flow

```
Article HTML
    ↓
Extract Image URLs (from <img src="...">)
    ↓
For Each Image:
  ├─ Download from source
  ├─ Validate (size > 2KB, dimensions > 200x200px)
  ├─ Upload to S3 bucket (startupnews-media-2026)
  ├─ Generate S3 URL
  └─ Update HTML with S3 URL
    ↓
Store in Database
```

### Image Naming Convention

Images are stored in S3 with this structure:
```
startupnews-media-2026/uploads/2026/04/admin-1712154623451-abc123def.jpg
                              ^     ^  ^
                              year  month naming pattern
```

### Configuration

Images are cached in database:
```
posts.featured_image_url     -- Main image (S3 URL)
posts.featured_image_small_url -- Same URL (for responsive display)
```

---

## 🎯 Auto-Categorization Logic

The script uses **keyword matching** to automatically assign one of 12 categories:

### Category Keywords

| Category | Keywords |
|----------|----------|
| ai-deeptech | ai, artificial intelligence, deep tech, machine learning, neural, gpt, llm |
| fintech | fintech, finance, bank, payment, crypto, bitcoin, blockchain, lending |
| social-media | social, twitter, facebook, instagram, tiktok, linkedin, influencer |
| robotics | robot, automation, drone, hardware, manufacturing |
| healthtech | health, medical, pharma, biotech, wellness, doctor, hospital |
| ev-mobility | electric, ev, vehicle, auto, car, battery, charging |
| ecommerce | ecommerce, retail, shopping, marketplace, seller, logistics |
| saas-enterprise | saas, enterprise, software, b2b, erp, crm, cloud, api |
| consumer-d2c | d2c, direct-to-consumer, brand, fmcg, fashion, food |
| web3-blockchain | web3, blockchain, nft, defi, smart contract, metaverse |
| cybersecurity | security, cybersecurity, hack, encryption, breach |
| climate-energy | climate, energy, green, renewable, solar, wind, carbon |

### Scoring Algorithm

1. Combine title + excerpt + content into one text string
2. Count keyword matches in each category
3. Weight longer keywords higher (keyword.length)
4. Return category with highest score
5. Default to 'ai-deeptech' if no matches

### Example

If article title is "Tesla Launches New EV Battery" + excerpt mentions "electric vehicle":
- **ev-mobility**: matches "ev", "vehicle", "battery", "electric" → score: 35
- **climate-energy**: matches "energy" → score: 6
- **ai-deeptech**: no matches → score: 0
- **Result**: ev-mobility ✓

---

## ⚠️ Important Considerations

### 1. Rate Limiting
The script includes delays to avoid overwhelming the server:
```typescript
const BATCH_SIZE = 50;  // Process in small batches
// Small delay between batches
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 2. Image Size Limits
- Minimum: 2KB
- Maximum: Per S3 configuration (usually 100MB)
- Dimensions: Minimum 200x200px

### 3. Content Limits
- Title: 255 characters
- Excerpt: 500 characters
- Content: 50,000 characters
- Slug: 200 characters

### 4. Error Handling
- **Missing required fields**: Articles skipped with warning logged
- **Duplicate detection**: Article skipped, logged as duplicate
- **Image download failures**: Post created without featured image (if not required)
- **Database errors**: Transaction rolled back, error logged

### 5. Timezone Handling
- All dates stored in database timezone (UTC)
- Dates extracted from website metadata (typically ISO 8601)
- Falls back to current date if no date found

---

## 🧪 Testing

### Test Scraping Logic

```bash
# Test with single page (no full scrape)
# Edit scrapePosts() to only fetch 1 page

# Run test
npx tsx scripts/scrape-startupnews-posts.ts

# Check database for new posts
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "SELECT COUNT(*) FROM posts WHERE created_from = 'manual' AND external_source_url LIKE 'https://startupnews%'"
```

### Verify Images in S3

```bash
# List uploaded images
aws s3 ls startupnews-media-2026/uploads/2026/04/ --recursive

# Check image integrity
aws s3 head-object --bucket startupnews-media-2026 \
  --key "uploads/2026/04/admin-1712154623451-abc123def.jpg"
```

### Review Duplicates

```sql
-- Check which posts came from startupnews
SELECT id, title, slug, published_at FROM posts 
WHERE external_source_url LIKE 'https://startupnews%'
ORDER BY published_at DESC
LIMIT 20;

-- Count by category
SELECT c.slug, COUNT(*) as count FROM posts p
JOIN categories c ON p.category_id = c.id
WHERE p.external_source_url LIKE 'https://startupnews%'
GROUP BY c.slug;
```

---

## 📝 Troubleshooting

### Issue: "No admin user found"
**Solution:**
```bash
npm run db:seed  # Re-run database seed
```

### Issue: "No categories found"
**Solution:**
```bash
# Check categories in database
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "SELECT id, slug, name FROM categories WHERE slug IN ('ai-deeptech', 'fintech', ...);"

# Re-seed if missing
npm run db:seed
```

### Issue: "S3 not configured"
**Solution:**
```bash
# Set AWS credentials in .env.local
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"
export S3_BUCKET="startupnews-media-2026"
```

### Issue: "Images not uploading to S3"
**Solution:**
```bash
# Check AWS credentials
aws s3 ls  # Should list buckets

# Check bucket permissions
aws s3api head-bucket --bucket startupnews-media-2026

# Test upload
aws s3 cp /tmp/test.jpg s3://startupnews-media-2026/test.jpg
```

### Issue: "Posts not appearing on website"
**Solution:**
```sql
-- Check post status
SELECT id, title, status, published_at FROM posts 
WHERE external_source_url LIKE 'https://startupnews%'
LIMIT 5;

-- Should be 'published' status
-- Check featured image
SELECT id, title, featured_image_url FROM posts 
WHERE external_source_url LIKE 'https://startupnews%'
LIMIT 5;
-- featured_image_url should not be NULL or empty
```

---

## 📦 Add npm Script

Update `package.json` to add the scraper command:

```json
{
  "scripts": {
    ...existing scripts...,
    "scrape:startupnews": "tsx scripts/scrape-startupnews-posts.ts"
  }
}
```

Then run with:
```bash
npm run scrape:startupnews
```

---

## 🎓 Next Steps

1. **Install dependencies**: `npm install cheerio @types/cheerio`
2. **Inspect the website**: Open in browser, look at HTML structure
3. **Update selectors** in `scrapePosts()` function
4. **Test on sample page**: Modify script to test with only a few articles
5. **Run full scrape**: Execute the script
6. **Verify results**: Check database and frontend
7. **Monitor for issues**: Check logs and database for errors

---

## 📞 Support

If you encounter issues:

1. **Check the logs**: Look for [ERROR] and [WARN] messages
2. **Review article structure**: Some websites have different patterns
3. **Test HTML parsing**: Use cheerio in Node REPL to test selectors
4. **Monitor database**: Run queries to verify data integrity
5. **Check S3**: Verify images are uploading correctly

---

**Script by:** Development Team  
**Last Updated:** April 3, 2026
