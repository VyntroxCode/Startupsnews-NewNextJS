# Zox Next.js – Project Documentation

This document describes the **Zox News** Next.js application in detail: frontend, backend, database, infrastructure, RSS pipeline, data flow, and key objects.

---

## 1. Project Overview

| Item | Description |
|------|-------------|
| **Name** | zox-nextjs (Zox News) |
| **Purpose** | News/startup content site: posts (manual + RSS), categories, events, search, admin. |
| **Stack** | Next.js 16 (App Router), React 19, TypeScript, MariaDB, Redis, AWS S3, node-cron. |
| **Theme** | Port of Zox News WordPress theme (layout, styles, responsive). |

**Key capabilities:**

- **Public site**: Home (featured, trending, latest, category sections), single post, category/sector pages, news listing, search, events, static pages (about, privacy, etc.).
- **Content sources**: Manual posts (admin) and **RSS feeds** (cron: fetch → parse → create posts, upload images to S3).
- **Admin**: Login (JWT), posts/categories/events/RSS feeds CRUD, upload images to S3.
- **Infrastructure**: MariaDB pool, Redis cache and locks, in-memory job queue, S3 for images (optional presigned URLs).

---

## 2. Tech Stack & Dependencies

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js |
| **Framework** | Next.js 16.1.6 (App Router) |
| **UI** | React 19.2.3, Tailwind CSS 4 |
| **Database** | MariaDB (driver: `mariadb` ^3.4.5) |
| **Cache / locks** | Redis (`redis` ^5.10.0) |
| **Auth** | JWT (`jsonwebtoken`), `bcryptjs` |
| **RSS** | `rss-parser` ^3.13.0 |
| **Scheduling** | `node-cron` ^4.2.1 |
| **AWS** | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| **Scripts** | `tsx` for running TS (migrations, cron, seeds) |

---

## 3. Architecture Overview

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                     NEXT.JS APP (SSR + API)               │
                    │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐ │
                    │  │   App Router │  │  API Routes │  │  Cron (optional   │ │
                    │  │   (pages)   │  │ /api/*      │  │   separate process)│ │
                    │  └──────┬──────┘  └──────┬──────┘  └─────────┬─────────┘ │
                    │         │                │                    │           │
                    │         ▼                ▼                    ▼           │
                    │  ┌─────────────────────────────────────────────────────┐  │
                    │  │           Data Adapter (lib/data-adapter.ts)        │  │
                    │  │  getFeat1LeftPosts, getTrendingPosts, getPostBySlug │  │
                    │  └──────────────────────────┬──────────────────────────┘  │
                    │                              │                             │
                    └──────────────────────────────┼─────────────────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
         │                                         ▼                                         │
         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
         │  │ PostsService │  │ EventsService│  │ Categories   │  │ RssFeedsService       │  │
         │  │ (posts.*)   │  │ (events.*)   │  │ Service      │  │ (rss-feeds.*)         │  │
         │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘  │
         │         │                 │                 │                      │                │
         │         ▼                 ▼                 ▼                      ▼                │
         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
         │  │   Repos      │  │   Repos      │  │   Repos      │  │ RssFeedsRepository   │  │
         │  │ (posts, etc.)│  │ (events)     │  │ (categories) │  │ RssPostCreatorService│  │
         │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘  │
         │         │                 │                 │                      │                │
         └─────────┼─────────────────┼─────────────────┼──────────────────────┼────────────────┘
                   │                 │                 │                      │
                   ▼                 ▼                 ▼                      ▼
         ┌─────────────────────────────────────────────────────────────────────────────────┐
         │  MariaDB (zox_db)     │  Redis (cache + locks)   │  AWS S3 (images)             │
         │  posts, categories,   │  posts:all:*, post:slug:  │  startupnews-media-2026     │
         │  users, rss_feeds,    │  lock:cron:*, lock:feed:N │  (presigned if private)     │
         │  rss_feed_items,      │                          │                             │
         │  events, post_tags    │                          │                             │
         └─────────────────────────────────────────────────────────────────────────────────┘
```

- **Frontend**: App Router pages and shared components; data via server components calling the data adapter (no direct DB in UI).
- **Data adapter**: Single entry point for all server-side data (home, trending, post by slug, categories, events, etc.). Uses services and caches (Redis) where configured.
- **Backend**: Module-based services (posts, events, categories, users, rss-feeds) and repositories (DB access). Image URLs resolved and optionally presigned in `posts.utils.ts`.
- **RSS**: Cron (script or HTTP) → scheduler job → in-memory queue → worker → RssFeedsService → RssPostCreatorService (fetch article, images to S3, insert post + rss_feed_items link).
- **Infrastructure**: MariaDB connection pool, Redis client (cache + distributed locks), S3 client for uploads and presigning.

---

## 4. Database

### 4.1 Connection

- **File**: `src/shared/database/connection.ts`
- **Driver**: `mariadb` pool.
- **Env**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, optional `DB_CONNECTION_LIMIT`, `DB_ACQUIRE_TIMEOUT`, `DB_IDLE_TIMEOUT`, `DB_SSL`.
- **API**: `query<T>(sql, params)`, `queryOne<T>(sql, params)`, `getDbConnection()`, `closeDbConnection()`.

### 4.2 Main Tables (logical)

| Table | Purpose |
|-------|---------|
| **posts** | Articles: title, slug, excerpt, content (LONGTEXT), category_id, author_id, featured_image_url, featured_image_small_url, format, status, featured, trending_score, view_count, published_at, created_at, updated_at. |
| **categories** | name, slug (used for routing and widget sections). |
| **users** | Admin/users: email, password hash, role. |
| **post_tags** | post_id, tag_name (tags for posts). |
| **rss_feeds** | name, url, category_id, author_id, enabled, fetch_interval_minutes, last_fetched_at, last_error, max_items_per_fetch, auto_publish, logo_url (from channel image). |
| **rss_feed_items** | rss_feed_id, guid, title, link, author, description, content, image_url, published_at, processed, post_id (link to created post). |
| **events** | Startup events: title, slug, excerpt, image, url, location, date, etc. |

Migrations (run manually):

- `scripts/migrations/add-rss-feeds.sql` – creates `rss_feeds`, `rss_feed_items`.
- `scripts/migrations/add-rss-source-author-logo.sql` – adds `rss_feeds.logo_url`, `rss_feed_items.author`.

### 4.3 Post list queries (thumbnail filter)

- Many list queries add a “has body and image” filter so only posts with content and at least one image (featured or `<img` in content) are returned.
- **Constant**: `HAS_BODY_AND_IMAGE` in `posts.repository.ts`:  
  `TRIM(COALESCE(content,'')) != '' AND (TRIM(COALESCE(featured_image_url,'')) != '' OR content LIKE '%<img%')`.
- Used in: `findLatest`, `findLatestForListing`, `findTrending`, `findByCategorySlug`, `findLatestExcluding`, etc. Admin list can bypass via `restrictThumbnail: false`.

---

## 5. RSS Pipeline (Data Flow)

### 5.1 Entry points

1. **Cron process** (recommended for production): `npx tsx cron/index.ts` or `RUN_ONCE=1 npx tsx cron/index.ts`.
   - Requires: `ENABLE_CRON`, `ENABLE_RSS_PROCESSING` (feature flags), DB, Redis.
   - Schedules with `node-cron` (default `*/10 * * * *`). Acquires Redis lock `lock:cron:rss-feeds-scheduler`, then runs scheduler job.
2. **HTTP**: `GET /api/cron/rss-feeds?secret=CRON_SECRET` – calls `RssFeedsService.processAllFeeds()` (no queue; processes all enabled feeds in process).

### 5.2 Cron process flow (with queue)

1. **Scheduler** (`cron/jobs/rss-feeds-scheduler.job.ts`): Loads enabled, due feeds from `rss_feeds`; for each, enqueues a job `RSS_FEED_PROCESS` with `{ feedId, feedUrl, feedName }`.
2. **Queue** (`queue/queue.memory.ts`): In-memory queue; processes jobs with optional delay and retries.
3. **Worker** (`workers/rss.worker.ts`): Handles `RSS_FEED_PROCESS`. Acquires per-feed Redis lock `lock:feed:{feedId}`; calls `RssFeedsService.processFeed(feed)`; updates `last_fetched_at` / `last_error`.
4. **RssFeedsService** (`modules/rss-feeds/service/rss-feeds.service.ts`):
   - Fetches and parses feed via `RssParserService.fetchAndParse(feed.url)`.
   - Updates feed `logo_url` from channel image if present.
   - For each item, checks `rss_feed_items` by GUID; keeps only new items; limits to `max_items_per_fetch` (e.g. 10).
   - For each new item: saves row in `rss_feed_items`, calls `RssPostCreatorService.createPostFromRssItem(item, feed)`, then links item to post (`post_id`).

### 5.3 RssPostCreatorService (per item)

- **Input**: Parsed RSS item (guid, title, link, description, content, imageUrl, publishedAt), feed entity, optional templates.
- **Article HTML**: If RSS content is short (< 800 chars), fetches full page from `item.link` and extracts article HTML (timeout 15s). Otherwise uses RSS content.
- **Images**:
  - Extracts all image URLs from article HTML; downloads each and uploads to S3 (`uploads/YYYY/MM/rss-{unique}-N.ext` under `S3_UPLOAD_PREFIX`).
  - Replaces original URLs in content with S3 URLs.
  - Featured image: first in-article image uploaded to S3, or RSS item image, or OG/Twitter image from fetched page; stored in `posts.featured_image_url` / `featured_image_small_url`.
- **Post**: Slug from title (slugify), category/author from feed, status from `feed.auto_publish`; inserts into `posts`, returns `postId`.
- **Link**: `rss_feed_items.post_id` set; original article URL stored in `rss_feed_items.link` (used later for “source” link and attribution).

### 5.4 RSS-related modules

| Path | Role |
|------|------|
| `modules/rss-feeds/domain/types.ts` | RssFeedEntity, RssFeedItemEntity, ParsedRssItem, ProcessFeedResult. |
| `modules/rss-feeds/repository/rss-feeds.repository.ts` | CRUD feeds, save/link items, findEnabledDue, getRssSourceByPostId (name, logo_url, author). |
| `modules/rss-feeds/service/rss-feeds.service.ts` | processFeed, processAllFeeds. |
| `modules/rss-feeds/service/rss-parser.service.ts` | fetchAndParse (RSS XML → items + feed image). |
| `modules/rss-feeds/service/rss-post-creator.service.ts` | createPostFromRssItem (HTML, images to S3, insert post, link item). |
| `modules/rss-feeds/utils/image-to-s3.ts` | downloadAndUploadToS3, s3KeyForRssImage, normalizeSourceImageUrl. |
| `modules/rss-feeds/utils/content-extract.ts` | extractArticleHtml, extractImageUrlsFromHtml, extractPrimaryImageFromHtml. |

After new posts are created, `invalidatePostsListCache()` is called so list caches (e.g. `posts:all:*`) are cleared and next request gets fresh data.

---

## 6. Data Pipeline: Entities → Posts (List & Single)

### 6.1 Source of entities

- **List endpoints**: e.g. `postsService.getFeaturedPosts(10)` → `repository.findLatest(10)` (SELECT * FROM posts WHERE status='published' AND HAS_BODY_AND_IMAGE ORDER BY id DESC LIMIT 10). No Redis cache at service layer for these; data adapter may cache the *result* of entitiesToPosts (see below).
- **Single post**: `postsService.getPostBySlug(slug)` → repository.findBySlug(slug). Cached in Redis as `post:slug:{slug}` (TTL 600s).

### 6.2 entityToPost (posts.utils.ts)

Converts one `PostEntity` to `Post` (used for both list and single):

1. **Category/tags**: Loads category name/slug and tag names from DB.
2. **Dates**: Uses published_at or created_at for display and publishedAt (ISO).
3. **Images**:
   - `getEntityImageUrl` / `getEntityImageSmallUrl`: Prefer first image from **content** (HTML); if none, use featured_image_url (and skip Unsplash/logo URLs).
   - `resolvedImage` / `resolvedSmall` = resolvePostImageUrl(entity image) – strips S3 presigned params, normalizes S3 path.
   - `imageS3` / `imageSmallS3`: From resolved if URL is our S3; else from first S3 image in content.
   - **fallbackImage**: Always first image from content (any URL), resolved and presigned if S3.
   - **finalImage** / **finalImageSmall**: fallbackImage || imageS3 || (resolved if not Unsplash/logo) || DEFAULT_THUMBNAIL. Content-derived image is preferred so list thumbnails match single post.
4. **Presigning**: If `S3_USE_PRESIGNED_URLS` is true and AWS creds set, S3 URLs (imageS3, imageSmallS3, fallbackImage) are passed through `toPresignedUrlIfEnabled()` so private buckets work.
5. **Output**: Post with id, slug, title, excerpt, content (string), category, categorySlug, date, timeAgo, publishedAt, image, imageSmall, format, featured, tags, status.

Content is normalized from entity (string, Buffer, or Redis-serialized Buffer) via `contentToString()` so first-image extraction works after cache round-trips.

### 6.3 Data adapter (list vs single)

- **List**: e.g. `getFeat1LeftPosts()` → `postsService.getFeaturedPosts(10)` → `entitiesToPosts(entities)` → `onlyPostsWithImage(posts)` → `{ main: posts[0], sub: [posts[1], posts[2]] }`. Many list functions cache the final Post[] (or shaped object) in Redis with keys like `posts:all:feat1:left`, TTL 60–300s.
- **Single**: `getPostBySlug(slug)` → `postsService.getPostBySlug(slug)` (entity from DB or cache) → `entityToPost(entity)` → then enriches with `sourceUrl` (from rss_feed_items.link) and RSS source attribution: `rssFeedsRepository.getRssSourceByPostId(postId)` → post.sourceName, post.sourceLogoUrl, post.sourceAuthor.

So: **entities** always come from DB (or post slug cache); **Post** is built by entityToPost; list caches store Post[] (or similar); single post adds source URL and RSS attribution after entityToPost.

---

## 7. Caching (Redis)

- **Client**: `src/shared/cache/redis.client.ts`. Connects to `REDIS_URL` (default `redis://localhost:6379`). On failure, cache is disabled (no throw).
- **Functions**: `getCache<T>(key)`, `setCache(key, value, ttlSeconds?)`, `deleteCache(key)`, `deleteCacheByPrefix(prefix)`, `invalidatePostsListCache()` (deletes `posts:all:*`).
- **Usage**:
  - Post list shapes: e.g. `posts:all:feat1:left`, `posts:all:trending:limit:5`, `posts:all:category_section:{slug}`, `post:slug:{slug}`.
  - Locks: `lock:cron:rss-feeds-scheduler`, `lock:feed:{feedId}` (see Redis lock section).
- **TTLs**: 60–300s for list caches; 600s for single post by slug.

---

## 8. Locks (Redis)

- **File**: `src/shared/locks/redis-lock.ts`.
- **RedisLock**: acquire (NX + PX), release (Lua: delete if value matches), extend, execute(fn).
- **createCronLock(ttl)**: key `lock:cron:rss-feeds-scheduler` – prevents overlapping scheduler runs.
- **createFeedLock(feedId, ttl)**: key `lock:feed:{feedId}` – prevents same feed being processed concurrently.

If Redis is unavailable, lock acquire is treated as success so cron/worker can still run (single-instance).

---

## 9. S3 & Images

- **Bucket**: From env `S3_BUCKET` (default `startupnews-media-2026`). Base URL from `NEXT_PUBLIC_IMAGE_BASE_URL` or `S3_IMAGE_BASE_URL`.
- **Upload paths**: RSS: `{S3_UPLOAD_PREFIX}/uploads/YYYY/MM/rss-{id}.ext`. Admin: `.../admin-{timestamp}-{random}.ext`. Events: `.../event-{slug}.ext`.
- **Presigning**: `src/shared/utils/s3-presign.ts`. `toPresignedUrlIfEnabled(s3ObjectUrl)` – if `S3_USE_PRESIGNED_URLS` is not false and URL is our bucket, returns presigned GET URL (expiry from `S3_PRESIGNED_EXPIRES_SECONDS`, default 3600). Used in entityToPost for featured and content-derived S3 URLs.
- **Next.js**: `next.config.ts` lists remote image patterns (Unsplash, S3, various CDNs). Components use `next/image` with `unoptimized` for external URLs where needed (e.g. PostImage).

---

## 10. API Routes (summary)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Health check. |
| `/api/cron/rss-feeds` | GET | Run RSS ingestion (?secret=CRON_SECRET). |
| `/api/cron/invalidate-post-cache` | GET | Invalidate posts list cache. |
| `/api/posts` | GET | List posts (query params). |
| `/api/posts/[slug]` | GET | Single post by slug. |
| `/api/categories` | GET | List categories. |
| `/api/categories/[slug]` | GET | Posts by category slug. |
| `/api/events` | GET | List events. |
| `/api/events/[slug]` | GET | Single event. |
| `/api/search` | GET | Search posts. |
| `/api/admin/auth/login` | POST | Admin login (JWT). |
| `/api/admin/auth/verify` | GET | Verify JWT. |
| `/api/admin/posts`, `/api/admin/posts/[id]` | GET/POST/PUT/DELETE | Posts CRUD. |
| `/api/admin/categories`, `/api/admin/categories/[id]` | GET/POST/PUT/DELETE | Categories CRUD. |
| `/api/admin/events`, `/api/admin/events/[id]` | GET/POST/PUT/DELETE | Events CRUD. |
| `/api/admin/rss-feeds`, `/api/admin/rss-feeds/[id]` | GET/POST/PUT/DELETE | RSS feeds CRUD. |
| `/api/admin/rss-feeds/[id]/fetch` | POST | Manual fetch one feed (bypass queue). |
| `/api/admin/rss-feeds/[id]/test` | GET | Test feed URL. |
| `/api/admin/rss-feeds/import` | POST | Import feeds (e.g. from JSON). |
| `/api/admin/rss-feeds/queue-status` | GET | Queue stats (waiting, active, completed, failed). |
| `/api/admin/upload` | POST | Upload image to S3 (admin). |
| `/api/admin/users` | GET | List users. |
| `/api/admin/stats` | GET | Admin dashboard stats. |
| `/api/debug/post-image-pipeline` | GET | Debug last post image resolution. |
| `/api/debug/latest-posts` | GET | Debug latest posts. |
| `/api/debug/s3-images` | GET | Debug S3/presign config. |

---

## 11. Frontend (App Router & Components)

### 11.1 Routes (pages)

| Path | File | Description |
|------|------|-------------|
| `/` | `app/page.tsx` | Home: feat1 left (main + sub), trending, more news, category sections (AI/Deeptech, Fintech, etc.), latest news, startup events sidebar. |
| `/post/[slug]` | `app/post/[slug]/page.tsx` | Single post: FullArticle, related, prev/next, more posts. |
| `/news` | `app/news/page.tsx` | News listing. |
| `/category/[slug]` | `app/category/[slug]/page.tsx` | Category archive. |
| `/sectors/[slug]` | `app/sectors/[slug]/page.tsx` | Sector page. |
| `/search` | `app/search/page.tsx` | Search results (query param). |
| `/events` | `app/events/page.tsx` | Events listing. |
| `/events/[slug]` | `app/events/[slug]/page.tsx` | Single event. |
| `/events/event-by-country` | `app/events/event-by-country/page.tsx` | Events by country. |
| `/startup-events/[slug]` | `app/startup-events/[slug]/page.tsx` | Startup event by slug. |
| `/about`, `/advertise-with-us`, `/privacy-policy`, `/terms-and-conditions`, `/return-refund-policy` | `app/.../page.tsx` | Static pages. |
| `/admin` | `app/(admin)/admin/page.tsx` | Admin dashboard. |
| `/admin/login` | `app/(admin)/admin/login/page.tsx` | Admin login. |
| `/admin/posts`, `/admin/posts/create`, `/admin/posts/edit/[id]` | ... | Posts CRUD UI. |
| `/admin/categories`, `/admin/categories/create`, `/admin/categories/edit/[id]` | ... | Categories CRUD. |
| `/admin/events`, `/admin/events/create`, `/admin/events/edit/[id]` | ... | Events CRUD. |
| `/admin/rss-feeds`, `/admin/rss-feeds/create`, `/admin/rss-feeds/edit/[id]` | ... | RSS feeds CRUD, “Fetch now”. |

### 11.2 Key components

- **Layout**: Root layout in `app/layout.tsx`; conditional layout (e.g. admin vs public) in `components/ConditionalLayout.tsx`.
- **Header / Footer / FlyMenu / Search**: Theme components.
- **PostImage**: Wraps `next/image`; handles external/S3 URLs, fallback placeholder.
- **FullArticle**: Single post: title, image, content, category, date, tags, RSS source (name, logo, author), source link, related posts, prev/next.
- **Home sections**: HomeWidgetSection, HomeDarkSection, HomeFeat1Section, MoreNewsSection, StartupEventsSection, StickySidebarContent.

### 11.3 Data flow (frontend)

- Pages are Server Components; they call data-adapter functions (e.g. `getFeat1LeftPosts()`, `getPostBySlug(slug)`), which return Post[] or Post. No direct DB or API calls from components; all go through the adapter.
- Revalidate: Home uses `revalidate = 10` so it revalidates every 10s. List data may also be cached in Redis with short TTL as above.

---

## 12. Auth (Admin)

- **Login**: POST `/api/admin/auth/login` with email/password; returns JWT.
- **Verify**: GET `/api/admin/auth/verify` with Bearer token.
- **Middleware**: `shared/middleware/auth.middleware.ts` protects admin routes (checks JWT, redirects to login).
- **Storage**: JWT in cookie or client; password hashed with bcrypt.

---

## 13. Environment & Configuration

- **Validation**: `src/shared/config/env-validation.ts` – required vars (e.g. DB_*, JWT_SECRET in prod), defaults, validators. `validateEnvironmentOrExit()` used by cron.
- **Feature flags**: `src/shared/config/feature-flags.ts` – ENABLE_CRON, ENABLE_RSS_PROCESSING, ENABLE_IMAGE_DOWNLOAD (env: true/1/yes/on).
- **Typical env** (see also docs/CRON_AND_SETTINGS.md and RSS_CRON_SETUP.md):

| Variable | Purpose |
|----------|---------|
| DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD | MariaDB. |
| REDIS_URL | Redis (cache + locks). |
| JWT_SECRET | Admin JWT signing. |
| AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION | S3 upload + presign. |
| S3_BUCKET, NEXT_PUBLIC_IMAGE_BASE_URL, S3_IMAGE_BASE_URL, S3_UPLOAD_PREFIX | S3 bucket and URLs. |
| S3_USE_PRESIGNED_URLS | If true, S3 URLs are presigned in entityToPost. |
| CRON_SECRET | Optional; required for GET /api/cron/rss-feeds if set. |
| ENABLE_CRON, ENABLE_RSS_PROCESSING | Feature flags for cron. |
| RSS_FEEDS_CRON_SCHEDULE | Cron schedule (default */10 * * * *). |
| TZ | Cron timezone (default UTC). |

---

## 14. Key Objects & Types

### 14.1 Post (domain / API)

- **Post** (data-adapter, posts.utils): id, slug, title, excerpt, content, category, categorySlug, date, timeAgo, publishedAt, image, imageSmall, format, featured, tags, status, sourceUrl, sourceName, sourceLogoUrl, sourceAuthor.
- **PostEntity** (DB): id, slug, title, excerpt, content, category_id, author_id, featured_image_url, featured_image_small_url, format, status, featured, trending_score, view_count, published_at, created_at, updated_at.

### 14.2 RSS

- **RssFeedEntity**: id, name, url, logo_url, category_id, author_id, enabled, fetch_interval_minutes, last_fetched_at, last_error, max_items_per_fetch, auto_publish, created_at, updated_at.
- **RssFeedItemEntity**: id, rss_feed_id, guid, title, link, author, description, content, image_url, published_at, processed, post_id, created_at, updated_at.
- **ParsedRssItem**: guid, title, link, author, description, content, imageUrl, publishedAt (from parser, before DB).

### 14.3 Events / Categories

- **StartupEvent**: id, location, date, title, url, excerpt, image (used in widgets).
- **Category**: name, slug (and id in DB).

### 14.4 Jobs (queue)

- **JobType**: RSS_FEED_PROCESS, RSS_ITEM_PROCESS.
- **RssFeedProcessJob**: payload { feedId, feedUrl, feedName }.

---

## 15. File Reference (key paths)

| Area | Paths |
|------|------|
| **App / pages** | `src/app/page.tsx`, `src/app/post/[slug]/page.tsx`, `src/app/category/[slug]/page.tsx`, `src/app/(admin)/admin/**`. |
| **Data layer** | `src/lib/data-adapter.ts`, `src/lib/post-utils.ts`, `src/lib/events-constants.ts`. |
| **Posts** | `src/modules/posts/service/posts.service.ts`, `src/modules/posts/repository/posts.repository.ts`, `src/modules/posts/utils/posts.utils.ts`, `src/modules/posts/domain/types.ts`. |
| **RSS** | `src/modules/rss-feeds/service/rss-feeds.service.ts`, `src/modules/rss-feeds/service/rss-post-creator.service.ts`, `src/modules/rss-feeds/service/rss-parser.service.ts`, `src/modules/rss-feeds/repository/rss-feeds.repository.ts`, `src/modules/rss-feeds/utils/image-to-s3.ts`, `src/modules/rss-feeds/utils/content-extract.ts`. |
| **Cron / queue** | `cron/index.ts`, `cron/jobs/rss-feeds-scheduler.job.ts`, `src/workers/rss.worker.ts`, `src/queue/queue.memory.ts`, `src/queue/job-types.ts`. |
| **Shared** | `src/shared/database/connection.ts`, `src/shared/cache/redis.client.ts`, `src/shared/locks/redis-lock.ts`, `src/shared/utils/s3-presign.ts`, `src/shared/config/env-validation.ts`, `src/shared/config/feature-flags.ts`. |
| **API** | `src/app/api/cron/rss-feeds/route.ts`, `src/app/api/posts/[slug]/route.ts`, `src/app/api/admin/**`. |
| **Migrations** | `scripts/migrations/add-rss-feeds.sql`, `scripts/migrations/add-rss-source-author-logo.sql`. |
| **Docs** | `docs/CRON_AND_SETTINGS.md`, `RSS_CRON_SETUP.md`, `docs/S3-IMAGES-SETUP.md` (if present). |

---

## 16. Data Flow Summary (end-to-end)

1. **RSS → Post**: Cron (or HTTP) → scheduler → queue → worker → RssFeedsService.processFeed → for each new item: RssPostCreatorService.createPostFromRssItem (fetch article, images to S3, insert post, link rss_feed_items) → invalidatePostsListCache().
2. **DB → List**: Page calls e.g. getFeat1LeftPosts() → (optional Redis cache) → postsService.getFeaturedPosts(10) → findLatest(10) → entitiesToPosts(entities) → entityToPost per entity (images from content/featured, presigned if needed) → onlyPostsWithImage → cache result → return { main, sub }.
3. **DB → Single post**: getPostBySlug(slug) → (optional Redis cache for entity) → entityToPost(entity) → enrich sourceUrl + getRssSourceByPostId (sourceName, sourceLogoUrl, sourceAuthor) → return Post.
4. **Admin**: Login → JWT → API calls with Bearer token; CRUD via repository/services; uploads go to S3 via shared S3 helpers.

This document reflects the codebase as of the analysis date; for cron schedule, env defaults, and RSS setup details, see `docs/CRON_AND_SETTINGS.md` and `RSS_CRON_SETUP.md`.
