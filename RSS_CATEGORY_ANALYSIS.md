# RSS Feed to Category Posts Analysis

**Date:** Analysis Report  
**Issue:** Categories on frontend homepage don't show articles from configured RSS feeds

---

## Executive Summary

After deep analysis of the codebase, I've identified **multiple root causes** why RSS feed articles aren't appearing in category pages on the frontend:

1. **RSS Posts Created as Drafts** - Posts are only published if specific conditions are met
2. **Strict Image Requirements** - Category queries filter out posts without proper images
3. **Auto-Publish Configuration** - RSS feeds may have `auto_publish` disabled
4. **Image Upload Failures** - RSS posts without successfully uploaded S3 images become drafts

---

## Root Cause Analysis

### 1. RSS Post Creation Logic (Primary Issue)

**File:** `src/modules/rss-feeds/service/rss-post-creator.service.ts`

**Lines 176-190:**
```typescript
// Publish only when we have a valid thumbnail and non-empty body; otherwise save as draft
const hasValidThumbnail = !!featuredImageUrl && featuredImageUrl.trim().length > 0;
const hasBody = typeof content === 'string' && content.trim().length > 0;
const published = feed.auto_publish && hasValidThumbnail && hasBody ? 1 : 0;
const post = await this.postsRepo.create({
  // ...
  status: published ? 'published' : 'draft',
  // ...
});
```

**Problem:**
- Posts are only published if **ALL** of these conditions are true:
  1. `feed.auto_publish === 1` (enabled in RSS feed config)
  2. `hasValidThumbnail === true` (featured image successfully uploaded to S3)
  3. `hasBody === true` (content is non-empty)

- If any condition fails, the post is created as **`draft`** and won't appear on the frontend

### 2. Category Query Filtering (Secondary Issue)

**File:** `src/modules/posts/repository/posts.repository.ts`

**Lines 4-6:**
```typescript
/** Only show published posts that have body (content) and at least one image (featured or <img> in content). */
const HAS_BODY_AND_IMAGE =
  " AND (TRIM(COALESCE(content, '')) != '' AND (TRIM(COALESCE(featured_image_url, '')) != '' OR content LIKE '%<img%'))";
```

**Lines 148-163:**
```typescript
async findByCategorySlug(categorySlug: string, limit?: number): Promise<PostEntity[]> {
  let sql = `
    SELECT p.* FROM posts p
    INNER JOIN categories c ON p.category_id = c.id
    WHERE c.slug = ? AND p.status = 'published'${HAS_BODY_AND_IMAGE.replace('content', 'p.content').replace('featured_image_url', 'p.featured_image_url')}
    ORDER BY p.id DESC
  `;
  // ...
}
```

**Problem:**
- Even if RSS posts are published, they're filtered out if they don't meet `HAS_BODY_AND_IMAGE`:
  - Must have non-empty content
  - Must have either:
    - A `featured_image_url` (S3 URL), OR
    - An `<img>` tag in the content

- This means:
  - Posts with images that failed to upload to S3 are excluded
  - Posts with only external image URLs (not in S3) are excluded
  - Posts with empty content are excluded

### 3. RSS Feed Configuration Issues

**File:** `src/app/(admin)/admin/rss-feeds/page.tsx`

**Potential Issues:**
- RSS feeds may have `auto_publish = 0` (disabled)
- RSS feeds may not be `enabled = 1`
- Category mapping might be incorrect (`category_id` doesn't match frontend category slugs)

### 4. Image Upload Failures

**File:** `src/modules/rss-feeds/service/rss-post-creator.service.ts`

**Lines 74-104:**
- Image upload to S3 can fail silently
- If image upload fails, `featuredImageUrl` remains `null`
- Posts without featured images become drafts (line 179)

---

## Data Flow Analysis

### RSS Feed Processing Flow:

```
1. Cron Job (every 10 min)
   ↓
2. RssFeedsSchedulerJob.execute()
   - Finds enabled feeds due for fetch
   - Enqueues feed processing jobs
   ↓
3. RssFeedWorker.processFeedJob()
   - Calls RssFeedsService.processFeed()
   ↓
4. RssFeedsService.processFeed()
   - Fetches and parses RSS feed
   - For each new item:
     ↓
5. RssPostCreatorService.createPostFromRssItem()
   - Fetches article HTML
   - Extracts images
   - Uploads images to S3
   - Creates post with:
     - categoryId: feed.category_id ✅ (CORRECT)
     - status: 'published' OR 'draft' ❌ (CONDITIONAL)
   ↓
6. Post saved to database
```

### Category Display Flow:

```
1. Frontend requests category posts
   ↓
2. getPostsByCategory(categorySlug)
   ↓
3. PostsService.getPostsByCategory(categorySlug)
   ↓
4. PostsRepository.findByCategorySlug(categorySlug)
   - Query: WHERE category.slug = ? 
            AND status = 'published' 
            AND (content != '' AND (featured_image_url != '' OR content LIKE '%<img%'))
   ↓
5. Results filtered and displayed
```

---

## Specific Issues Found

### Issue #1: Auto-Publish May Be Disabled
- **Location:** RSS feed configuration in admin panel
- **Check:** `rss_feeds.auto_publish` column
- **Impact:** All posts from that feed become drafts

### Issue #2: Image Upload Failures
- **Location:** `rss-post-creator.service.ts` lines 74-104
- **Impact:** Posts without S3 images become drafts
- **Common causes:**
  - S3 credentials incorrect
  - Network timeouts
  - Invalid image URLs in RSS feed
  - Image download failures

### Issue #3: Strict Image Requirements
- **Location:** `posts.repository.ts` line 5-6
- **Impact:** Even published posts without proper images are filtered out
- **Note:** This is intentional design to ensure all displayed posts have thumbnails

### Issue #4: Category ID Mismatch
- **Location:** RSS feed `category_id` vs frontend category slugs
- **Impact:** Posts created in wrong category or category doesn't exist
- **Check:** Verify `rss_feeds.category_id` matches actual category IDs used on homepage

---

## Verification Queries

Run these SQL queries to diagnose:

```sql
-- 1. Check RSS feeds configuration
SELECT id, name, category_id, enabled, auto_publish, last_fetched_at, last_error
FROM rss_feeds;

-- 2. Check RSS posts by category
SELECT 
  p.id, 
  p.title, 
  p.status, 
  p.category_id,
  c.name as category_name,
  c.slug as category_slug,
  p.featured_image_url,
  CASE 
    WHEN p.featured_image_url IS NOT NULL AND p.featured_image_url != '' THEN 'Has Featured'
    WHEN p.content LIKE '%<img%' THEN 'Has Image in Content'
    ELSE 'No Image'
  END as image_status,
  CASE 
    WHEN p.content IS NOT NULL AND TRIM(p.content) != '' THEN 'Has Content'
    ELSE 'No Content'
  END as content_status
FROM posts p
INNER JOIN categories c ON p.category_id = c.id
WHERE p.id IN (SELECT post_id FROM rss_feed_items WHERE post_id IS NOT NULL)
ORDER BY p.id DESC
LIMIT 50;

-- 3. Count published vs draft RSS posts
SELECT 
  p.status,
  COUNT(*) as count
FROM posts p
WHERE p.id IN (SELECT post_id FROM rss_feed_items WHERE post_id IS NOT NULL)
GROUP BY p.status;

-- 4. Check which categories have RSS feeds configured
SELECT 
  c.id,
  c.name,
  c.slug,
  COUNT(rf.id) as rss_feed_count,
  COUNT(CASE WHEN rf.enabled = 1 THEN 1 END) as enabled_feeds,
  COUNT(CASE WHEN rf.auto_publish = 1 THEN 1 END) as auto_publish_feeds
FROM categories c
LEFT JOIN rss_feeds rf ON c.id = rf.category_id
GROUP BY c.id, c.name, c.slug
ORDER BY c.id;
```

---

## Recommended Fixes

### Fix #1: Check RSS Feed Configuration
1. Go to Admin Panel → RSS Feeds
2. Verify each feed has:
   - ✅ `enabled = 1` (feed is active)
   - ✅ `auto_publish = 1` (posts auto-publish)
   - ✅ `category_id` matches the category you expect on frontend

### Fix #2: Check Post Status
1. Go to Admin Panel → Posts
2. Filter by source: "RSS"
3. Check how many are `draft` vs `published`
4. If many are drafts, check:
   - S3 image upload configuration
   - RSS feed content quality
   - Image extraction logic

### Fix #3: Verify Category Mapping
1. Check homepage category slugs (e.g., "artificial-intelligence", "fintech")
2. Verify RSS feeds are linked to correct category IDs
3. Run SQL query to verify mapping

### Fix #4: Check Image Upload
1. Verify S3 credentials in `.env.local`
2. Check logs for image upload errors
3. Test RSS feed manually via admin panel "Fetch" button
4. Check if posts are created but as drafts

---

## Code Locations Summary

| Component | File | Key Lines | Issue |
|-----------|------|-----------|-------|
| RSS Post Creator | `src/modules/rss-feeds/service/rss-post-creator.service.ts` | 176-190 | Posts become drafts if conditions not met |
| Category Query | `src/modules/posts/repository/posts.repository.ts` | 4-6, 148-163 | Filters out posts without images |
| RSS Feed Service | `src/modules/rss-feeds/service/rss-feeds.service.ts` | 46-94 | Processes feeds and creates posts |
| Admin RSS Page | `src/app/(admin)/admin/rss-feeds/page.tsx` | - | Shows feed configuration |
| Admin Categories | `src/app/(admin)/admin/categories/page.tsx` | - | Shows categories but not RSS link |

---

## Next Steps

1. **Immediate:** Run verification SQL queries to identify the specific issue
2. **Check:** Admin panel RSS feeds configuration (enabled, auto_publish, category_id)
3. **Verify:** S3 image upload is working (check logs, test manually)
4. **Review:** Draft posts in admin panel to see why they weren't published
5. **Fix:** Based on findings, either:
   - Enable `auto_publish` on feeds
   - Fix S3 image upload issues
   - Adjust category mappings
   - Review image extraction logic

---

**Analysis Complete** ✅

