# RSS Feed Cron Job Implementation Plan

## Overview

This document outlines the complete implementation plan for adding RSS feed functionality to the news article system. The system will support two methods of posting articles:
1. **Manual Posting** - Already implemented via admin panel
2. **Automated RSS Feed Posting** - New feature using cron jobs

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Admin Panel Integration](#admin-panel-integration)
4. [RSS Feed Service](#rss-feed-service)
5. [Cron Job System](#cron-job-system)
6. [Post Creation from RSS](#post-creation-from-rss)
7. [Implementation Steps](#implementation-steps)
8. [File Structure](#file-structure)
9. [Configuration](#configuration)
10. [Error Handling & Logging](#error-handling--logging)
11. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### System Flow

```
┌─────────────────┐
│  Admin Panel    │
│  (RSS Settings) │
└────────┬────────┘
         │
         │ Store RSS Feed URLs
         ▼
┌─────────────────┐
│  Settings Table │
│  (RSS Feeds)    │
└────────┬────────┘
         │
         │ Cron Job Reads
         ▼
┌─────────────────┐
│  Cron Service   │
│  (Scheduled)    │
└────────┬────────┘
         │
         │ Fetch & Parse
         ▼
┌─────────────────┐
│  RSS Parser     │
│  Service        │
└────────┬────────┘
         │
         │ Extract Articles
         ▼
┌─────────────────┐
│  Post Creator   │
│  Service        │
└────────┬────────┘
         │
         │ Create Posts
         ▼
┌─────────────────┐
│  Posts Table    │
└─────────────────┘
```

### Key Components

1. **RSS Feed Management** - Admin panel interface to add/edit/delete RSS feed URLs
2. **RSS Feed Storage** - Database table to store RSS feed configurations
3. **Cron Job Service** - Scheduled service that runs periodically to fetch RSS feeds
4. **RSS Parser** - Service to parse RSS/Atom feeds and extract article data
5. **Post Creator** - Service to convert RSS items into posts
6. **Image Downloader** - Service to download and process images from RSS items
7. **Duplicate Detection** - Mechanism to prevent duplicate posts

---

## Database Schema

### New Table: `rss_feeds`

```sql
CREATE TABLE IF NOT EXISTS rss_feeds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT 'Display name for the RSS feed',
    url VARCHAR(500) NOT NULL COMMENT 'RSS feed URL',
    category_id INT NOT NULL COMMENT 'Default category for posts from this feed',
    author_id INT NOT NULL COMMENT 'Default author for posts from this feed',
    enabled BOOLEAN DEFAULT TRUE COMMENT 'Whether this feed is active',
    fetch_interval INT DEFAULT 60 COMMENT 'Fetch interval in minutes',
    last_fetched_at TIMESTAMP NULL COMMENT 'Last successful fetch timestamp',
    last_error TEXT NULL COMMENT 'Last error message if fetch failed',
    error_count INT DEFAULT 0 COMMENT 'Consecutive error count',
    max_items_per_fetch INT DEFAULT 10 COMMENT 'Maximum items to process per fetch',
    auto_publish BOOLEAN DEFAULT FALSE COMMENT 'Auto-publish posts or save as draft',
    image_download BOOLEAN DEFAULT TRUE COMMENT 'Download images from feed items',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_enabled (enabled),
    INDEX idx_last_fetched (last_fetched_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### New Table: `rss_feed_items`

```sql
CREATE TABLE IF NOT EXISTS rss_feed_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rss_feed_id INT NOT NULL,
    guid VARCHAR(500) NOT NULL COMMENT 'Unique identifier from RSS feed',
    title VARCHAR(500) NOT NULL,
    link VARCHAR(500) NOT NULL COMMENT 'Original article URL',
    description TEXT COMMENT 'Article description/excerpt',
    content TEXT COMMENT 'Full article content if available',
    image_url VARCHAR(500) COMMENT 'Image URL from feed',
    published_at TIMESTAMP NULL COMMENT 'Publication date from feed',
    processed BOOLEAN DEFAULT FALSE COMMENT 'Whether this item has been processed',
    post_id INT NULL COMMENT 'ID of created post if processed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rss_feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    UNIQUE KEY unique_guid_per_feed (rss_feed_id, guid),
    INDEX idx_processed (processed),
    INDEX idx_published (published_at),
    INDEX idx_guid (guid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Migration Script

Create `scripts/migrations/add-rss-feeds.sql`:

```sql
-- Add RSS feeds table
CREATE TABLE IF NOT EXISTS rss_feeds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    category_id INT NOT NULL,
    author_id INT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    fetch_interval INT DEFAULT 60,
    last_fetched_at TIMESTAMP NULL,
    last_error TEXT NULL,
    error_count INT DEFAULT 0,
    max_items_per_fetch INT DEFAULT 10,
    auto_publish BOOLEAN DEFAULT FALSE,
    image_download BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_enabled (enabled),
    INDEX idx_last_fetched (last_fetched_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add RSS feed items table
CREATE TABLE IF NOT EXISTS rss_feed_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rss_feed_id INT NOT NULL,
    guid VARCHAR(500) NOT NULL,
    title VARCHAR(500) NOT NULL,
    link VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    image_url VARCHAR(500),
    published_at TIMESTAMP NULL,
    processed BOOLEAN DEFAULT FALSE,
    post_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rss_feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    UNIQUE KEY unique_guid_per_feed (rss_feed_id, guid),
    INDEX idx_processed (processed),
    INDEX idx_published (published_at),
    INDEX idx_guid (guid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Admin Panel Integration

### 1. Admin Sidebar Update

Add "RSS Feeds" menu item to `src/components/admin/AdminSidebar.tsx`:

```typescript
const RssFeedsIcon = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M4 4.5C3.2 4.5 2.5 5.2 2.5 6S3.2 7.5 4 7.5 5.5 6.8 5.5 6 4.8 4.5 4 4.5z"/>
    <path d="M2.5 2.5c.8 0 1.5.7 1.5 1.5v8c0 .8-.7 1.5-1.5 1.5S1 12.8 1 12V4c0-.8.7-1.5 1.5-1.5z"/>
    <path d="M2.5 9.5c.8 0 1.5.7 1.5 1.5v8c0 .8-.7 1.5-1.5 1.5S1 19.8 1 19v-8c0-.8.7-1.5 1.5-1.5z"/>
    <path d="M8 2h13M8 6h13M8 10h8M8 14h13M8 18h13"/>
  </svg>
);

// Add to menuItems array
{ href: '/admin/rss-feeds', label: 'RSS Feeds', icon: RssFeedsIcon },
```

### 2. RSS Feeds List Page

Create `src/app/(admin)/admin/rss-feeds/page.tsx`:

**Features:**
- List all RSS feeds with status (enabled/disabled)
- Show last fetch time and error status
- Actions: Edit, Delete, Test Feed, Enable/Disable
- Add new RSS feed button

### 3. RSS Feed Create/Edit Page

Create `src/app/(admin)/admin/rss-feeds/create/page.tsx` and `edit/[id]/page.tsx`:

**Form Fields:**
- Name (required)
- RSS Feed URL (required, validated)
- Default Category (dropdown, required)
- Default Author (dropdown, required)
- Fetch Interval (minutes, default: 60)
- Max Items Per Fetch (default: 10)
- Auto Publish (checkbox, default: false)
- Download Images (checkbox, default: true)
- Enabled (checkbox, default: true)

**Validation:**
- URL must be valid and accessible
- Category and Author must exist
- Fetch interval must be >= 15 minutes

### 4. API Routes

#### GET `/api/admin/rss-feeds`
- List all RSS feeds
- Support pagination and filtering

#### GET `/api/admin/rss-feeds/[id]`
- Get single RSS feed details

#### POST `/api/admin/rss-feeds`
- Create new RSS feed
- Validate URL accessibility
- Test feed parsing

#### PUT `/api/admin/rss-feeds/[id]`
- Update RSS feed configuration

#### DELETE `/api/admin/rss-feeds/[id]`
- Delete RSS feed and related items

#### POST `/api/admin/rss-feeds/[id]/test`
- Test RSS feed URL
- Parse feed and return sample items
- Validate feed structure

#### POST `/api/admin/rss-feeds/[id]/fetch`
- Manually trigger feed fetch (for testing)

---

## RSS Feed Service

### Module Structure

```
src/modules/rss-feeds/
├── domain/
│   └── types.ts              # TypeScript interfaces
├── repository/
│   └── rss-feeds.repository.ts
├── service/
│   ├── rss-feeds.service.ts  # Business logic
│   ├── rss-parser.service.ts # RSS/Atom parsing
│   └── rss-post-creator.service.ts # Convert RSS items to posts
└── utils/
    └── rss-feeds.utils.ts
```

### RSS Parser Service

**File:** `src/modules/rss-feeds/service/rss-parser.service.ts`

**Responsibilities:**
- Fetch RSS/Atom feeds from URLs
- Parse XML content
- Extract feed metadata (title, description, link)
- Extract feed items (title, link, description, content, image, published date, GUID)
- Handle different RSS formats (RSS 2.0, Atom, RDF)
- Error handling for malformed feeds

**Key Methods:**
```typescript
class RssParserService {
  async fetchFeed(url: string): Promise<FeedData>
  async parseFeed(xml: string): Promise<ParsedFeed>
  extractItems(feed: ParsedFeed): Promise<RssFeedItem[]>
  normalizeItem(item: any): RssFeedItem
}
```

**Dependencies:**
- `rss-parser` npm package (or `fast-xml-parser`)
- HTTP client for fetching feeds

### RSS Post Creator Service

**File:** `src/modules/rss-feeds/service/rss-post-creator.service.ts`

**Responsibilities:**
- Convert RSS feed items to post entities
- Generate slugs from titles
- Download and process images
- Handle duplicate detection
- Create posts via PostsService
- Link RSS items to created posts

**Key Methods:**
```typescript
class RssPostCreatorService {
  async createPostFromRssItem(
    item: RssFeedItem,
    feed: RssFeedEntity,
    categoryId: number,
    authorId: number
  ): Promise<PostEntity>
  
  async downloadImage(imageUrl: string): Promise<string>
  
  async isDuplicate(guid: string, feedId: number): Promise<boolean>
  
  generateSlug(title: string): string
}
```

---

## Cron Job System

### Architecture Options

#### Option 1: Next.js API Route with External Scheduler (Recommended)

Use Next.js API route as cron endpoint, triggered by external scheduler:
- **Vercel Cron** (if deployed on Vercel)
- **GitHub Actions** (scheduled workflows)
- **cron-job.org** (external service)
- **System cron** (Linux cron on server)

**Pros:**
- Simple implementation
- No separate service needed
- Leverages existing Next.js infrastructure

**Cons:**
- Dependent on external scheduler
- Less control over execution

#### Option 2: Separate Node.js Cron Service

Run a separate Node.js service with `node-cron`:

**Pros:**
- Full control over scheduling
- Can run independently
- Better for complex scheduling needs

**Cons:**
- Requires separate deployment
- More infrastructure to manage

### Recommended: Next.js API Route + External Scheduler

### Implementation

#### 1. Cron API Route

Create `src/app/api/cron/rss-feeds/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { RssFeedsService } from '@/modules/rss-feeds/service/rss-feeds.service';

// Security: Verify cron secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret from query param or header
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rssFeedsService = new RssFeedsService();
    const result = await rssFeedsService.processAllFeeds();
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      created: result.created,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

#### 2. RSS Feeds Service - Process All Feeds

**File:** `src/modules/rss-feeds/service/rss-feeds.service.ts`

```typescript
class RssFeedsService {
  async processAllFeeds(): Promise<ProcessResult> {
    const feeds = await this.repository.findEnabled();
    const results: ProcessResult = {
      processed: 0,
      created: 0,
      errors: [],
    };

    for (const feed of feeds) {
      try {
        // Check if feed needs to be fetched based on interval
        if (!this.shouldFetch(feed)) {
          continue;
        }

        const result = await this.processFeed(feed);
        results.processed++;
        results.created += result.postsCreated;
      } catch (error) {
        results.errors.push({
          feedId: feed.id,
          feedName: feed.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        await this.recordError(feed.id, error);
      }
    }

    return results;
  }

  async processFeed(feed: RssFeedEntity): Promise<FeedProcessResult> {
    // 1. Fetch and parse RSS feed
    const parser = new RssParserService();
    const feedData = await parser.fetchFeed(feed.url);
    const items = await parser.extractItems(feedData);

    // 2. Filter new items (not in rss_feed_items table)
    const newItems = await this.filterNewItems(items, feed.id);

    // 3. Limit items based on max_items_per_fetch
    const itemsToProcess = newItems.slice(0, feed.max_items_per_fetch);

    // 4. Create posts from items
    const creator = new RssPostCreatorService();
    let postsCreated = 0;

    for (const item of itemsToProcess) {
      try {
        // Save RSS item first
        const savedItem = await this.repository.saveFeedItem({
          rss_feed_id: feed.id,
          guid: item.guid,
          title: item.title,
          link: item.link,
          description: item.description,
          content: item.content,
          image_url: item.imageUrl,
          published_at: item.publishedAt,
        });

        // Create post
        const post = await creator.createPostFromRssItem(
          item,
          feed,
          feed.category_id,
          feed.author_id
        );

        // Link post to RSS item
        await this.repository.linkItemToPost(savedItem.id, post.id);

        postsCreated++;
      } catch (error) {
        console.error(`Error processing item ${item.guid}:`, error);
        // Continue with next item
      }
    }

    // 5. Update feed last_fetched_at
    await this.repository.updateLastFetched(feed.id);

    return { postsCreated, itemsProcessed: itemsToProcess.length };
  }

  private shouldFetch(feed: RssFeedEntity): boolean {
    if (!feed.last_fetched_at) {
      return true; // Never fetched, fetch now
    }

    const lastFetched = new Date(feed.last_fetched_at);
    const now = new Date();
    const minutesSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60);

    return minutesSinceLastFetch >= feed.fetch_interval;
  }
}
```

#### 3. Scheduling Options

**Option A: Vercel Cron (if using Vercel)**

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/rss-feeds?secret=YOUR_SECRET",
    "schedule": "*/30 * * * *"
  }]
}
```

**Option B: GitHub Actions**

Create `.github/workflows/rss-cron.yml`:
```yaml
name: RSS Feed Cron
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  fetch-rss:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger RSS Feed Fetch
        run: |
          curl -X GET "https://your-domain.com/api/cron/rss-feeds?secret=${{ secrets.CRON_SECRET }}"
```

**Option C: System Cron (Linux Server)**

Add to crontab:
```bash
*/30 * * * * curl -X GET "https://your-domain.com/api/cron/rss-feeds?secret=YOUR_SECRET"
```

**Option D: External Service (cron-job.org)**

Configure HTTP GET request to:
```
https://your-domain.com/api/cron/rss-feeds?secret=YOUR_SECRET
```

---

## Post Creation from RSS

### Process Flow

1. **Fetch RSS Feed**
   - HTTP GET request to RSS URL
   - Handle timeouts and errors
   - Validate response

2. **Parse Feed**
   - Parse XML content
   - Extract feed metadata
   - Extract feed items

3. **Filter New Items**
   - Check `rss_feed_items` table for existing GUIDs
   - Only process new items

4. **Process Each Item**
   - Save RSS item to `rss_feed_items` table
   - Generate slug from title
   - Download image (if enabled)
   - Create post via PostsService
   - Link RSS item to post

5. **Update Feed Status**
   - Update `last_fetched_at`
   - Reset error count on success
   - Increment error count on failure

### Image Download

**File:** `src/modules/rss-feeds/utils/image-downloader.ts`

```typescript
class ImageDownloader {
  async downloadImage(imageUrl: string, postSlug: string): Promise<string> {
    // 1. Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // 2. Get image buffer
    const buffer = await response.arrayBuffer();

    // 3. Determine file extension
    const contentType = response.headers.get('content-type');
    const extension = this.getExtensionFromContentType(contentType);

    // 4. Generate filename
    const filename = `${postSlug}-${Date.now()}.${extension}`;
    const filepath = path.join(process.env.UPLOAD_DIR || './public/uploads', filename);

    // 5. Save file
    await fs.writeFile(filepath, Buffer.from(buffer));

    // 6. Return public URL
    return `/uploads/${filename}`;
  }

  private getExtensionFromContentType(contentType: string | null): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return map[contentType || ''] || 'jpg';
  }
}
```

### Duplicate Detection

**Strategy:**
- Use GUID from RSS feed as unique identifier
- Store GUID in `rss_feed_items` table with unique constraint
- Check before processing: `SELECT * FROM rss_feed_items WHERE rss_feed_id = ? AND guid = ?`
- If exists and processed, skip item

**Fallback:**
- If GUID not available, use title + link combination
- Hash combination and store as GUID

---

## Implementation Steps

### Phase 1: Database Setup
1. ✅ Create migration script for `rss_feeds` table
2. ✅ Create migration script for `rss_feed_items` table
3. ✅ Run migrations on database

### Phase 2: Core Services
1. ✅ Create RSS Feeds domain types
2. ✅ Create RSS Feeds repository
3. ✅ Create RSS Parser service
4. ✅ Create RSS Post Creator service
5. ✅ Create RSS Feeds service (orchestration)

### Phase 3: Admin Panel
1. ✅ Update AdminSidebar with RSS Feeds menu
2. ✅ Create RSS Feeds list page
3. ✅ Create RSS Feed create page
4. ✅ Create RSS Feed edit page
5. ✅ Create API routes for RSS feeds CRUD
6. ✅ Add test feed functionality

### Phase 4: Cron Job
1. ✅ Create cron API route
2. ✅ Implement feed processing logic
3. ✅ Add error handling and logging
4. ✅ Set up external scheduler

### Phase 5: Image Handling
1. ✅ Implement image downloader
2. ✅ Add image processing (resize, optimize)
3. ✅ Handle image errors gracefully

### Phase 6: Testing & Refinement
1. ✅ Test with various RSS feeds
2. ✅ Test duplicate detection
3. ✅ Test error scenarios
4. ✅ Performance optimization
5. ✅ Add monitoring and alerts

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── rss-feeds/
│   │   │       ├── route.ts                    # GET, POST
│   │   │       ├── [id]/
│   │   │       │   ├── route.ts                # GET, PUT, DELETE
│   │   │       │   ├── test/
│   │   │       │   │   └── route.ts            # POST - test feed
│   │   │       │   └── fetch/
│   │   │       │       └── route.ts            # POST - manual fetch
│   │   └── cron/
│   │       └── rss-feeds/
│   │           └── route.ts                    # GET - cron endpoint
│   └── (admin)/
│       └── admin/
│           └── rss-feeds/
│               ├── page.tsx                    # List page
│               ├── create/
│               │   └── page.tsx                # Create form
│               └── edit/
│                   └── [id]/
│                       └── page.tsx            # Edit form
│
├── modules/
│   └── rss-feeds/
│       ├── domain/
│       │   └── types.ts                        # TypeScript interfaces
│       ├── repository/
│       │   └── rss-feeds.repository.ts         # Database operations
│       ├── service/
│       │   ├── rss-feeds.service.ts            # Main service
│       │   ├── rss-parser.service.ts           # RSS parsing
│       │   └── rss-post-creator.service.ts     # Post creation
│       └── utils/
│           ├── rss-feeds.utils.ts              # Utility functions
│           └── image-downloader.ts             # Image download
│
└── scripts/
    └── migrations/
        └── add-rss-feeds.sql                   # Database migration
```

---

## Configuration

### Environment Variables

Add to `.env.local`:

```bash
# RSS Feed Cron
CRON_SECRET=your-secure-random-secret-key-here
RSS_FETCH_TIMEOUT=30000  # 30 seconds
RSS_MAX_IMAGE_SIZE=5242880  # 5MB
RSS_DEFAULT_FETCH_INTERVAL=60  # minutes
```

### Package Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "rss-parser": "^3.13.0",
    "fast-xml-parser": "^4.3.2",
    "node-cron": "^3.0.3"  // If using separate cron service
  },
  "devDependencies": {
    "@types/rss-parser": "^3.13.0"
  }
}
```

---

## Error Handling & Logging

### Error Types

1. **Feed Fetch Errors**
   - Network errors (timeout, connection refused)
   - HTTP errors (404, 500, etc.)
   - Invalid feed format

2. **Parsing Errors**
   - Malformed XML
   - Missing required fields
   - Encoding issues

3. **Post Creation Errors**
   - Duplicate slug
   - Invalid category/author
   - Image download failures

### Error Handling Strategy

```typescript
// Record errors in database
await repository.recordError(feedId, errorMessage);

// Increment error count
await repository.incrementErrorCount(feedId);

// Disable feed after N consecutive errors
if (errorCount >= 5) {
  await repository.disableFeed(feedId);
  // Send alert to admin
}
```

### Logging

```typescript
// Use structured logging
logger.info('RSS Feed Processing', {
  feedId: feed.id,
  feedName: feed.name,
  itemsFound: items.length,
  itemsProcessed: itemsToProcess.length,
  postsCreated: postsCreated,
});

logger.error('RSS Feed Error', {
  feedId: feed.id,
  error: error.message,
  stack: error.stack,
});
```

---

## Testing Strategy

### Unit Tests

1. **RSS Parser Service**
   - Test RSS 2.0 parsing
   - Test Atom feed parsing
   - Test malformed XML handling
   - Test missing fields handling

2. **Post Creator Service**
   - Test slug generation
   - Test duplicate detection
   - Test image download
   - Test post creation

3. **RSS Feeds Service**
   - Test feed filtering logic
   - Test interval checking
   - Test error handling

### Integration Tests

1. **End-to-End Feed Processing**
   - Test complete flow from RSS URL to post creation
   - Test with real RSS feeds
   - Test error scenarios

2. **Admin Panel**
   - Test RSS feed CRUD operations
   - Test feed validation
   - Test test feed functionality

### Manual Testing

1. **Add Test RSS Feed**
   - Use a known good RSS feed (e.g., TechCrunch, BBC News)
   - Verify feed is saved correctly
   - Test feed parsing

2. **Trigger Manual Fetch**
   - Use test endpoint to fetch feed
   - Verify posts are created
   - Check images are downloaded

3. **Test Cron Job**
   - Manually call cron endpoint
   - Verify all enabled feeds are processed
   - Check error handling

---

## Security Considerations

1. **Cron Secret**
   - Use strong random secret
   - Store in environment variables
   - Never commit to repository

2. **Input Validation**
   - Validate RSS URLs
   - Sanitize RSS content
   - Validate image URLs before download

3. **Rate Limiting**
   - Limit requests per feed
   - Implement backoff on errors
   - Prevent abuse

4. **Image Security**
   - Validate image file types
   - Scan for malicious content
   - Limit image file size

---

## Monitoring & Alerts

### Metrics to Track

1. **Feed Health**
   - Success rate per feed
   - Average processing time
   - Error frequency

2. **Post Creation**
   - Posts created per feed
   - Posts created per day
   - Duplicate detection rate

3. **System Health**
   - Cron job execution time
   - API response times
   - Database query performance

### Alerts

1. **Feed Failures**
   - Alert when feed fails 3+ times consecutively
   - Alert when feed hasn't been fetched in 24 hours

2. **System Issues**
   - Alert when cron job fails
   - Alert on high error rates

---

## Future Enhancements

1. **Content Enrichment**
   - Full article content extraction (if only summary in RSS)
   - Automatic tagging based on content
   - Sentiment analysis

2. **Advanced Filtering**
   - Keyword filtering
   - Category auto-assignment based on content
   - Duplicate detection across feeds

3. **Scheduling**
   - Per-feed scheduling
   - Time-based filtering (only fetch during certain hours)
   - Priority-based processing

4. **Analytics**
   - Track which RSS feeds generate most views
   - Performance metrics per feed
   - Content quality scoring

---

## Conclusion

This implementation plan provides a comprehensive guide for adding RSS feed functionality to the news article system. The architecture is designed to be:

- **Scalable** - Can handle multiple RSS feeds efficiently
- **Reliable** - Robust error handling and duplicate detection
- **Maintainable** - Clean separation of concerns
- **Flexible** - Easy to add new features and customize behavior

The system supports both manual posting (existing) and automated RSS feed posting (new), giving content managers flexibility in how they populate the site with articles.

