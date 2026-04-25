# RSS Feed Cron – Setup Guide

This project includes a **cron job** that runs every 10 minutes, fetches configured RSS feeds, and creates posts with **images uploaded to S3**.

> **Full reference:** For cron schedule options, all environment variables, database columns, and troubleshooting, see **[docs/CRON_AND_SETTINGS.md](docs/CRON_AND_SETTINGS.md)**. The site shows the latest posts; images are served from S3, not the original source.

## What’s implemented

- **DB**: `rss_feeds` and `rss_feed_items` tables (migration in `scripts/migrations/add-rss-feeds.sql`).
- **Module**: `src/modules/rss-feeds/` (parser, S3 image upload, post creator, service).
- **Cron**: Script `scripts/cron-fetch-rss-feeds.ts` and API route `GET /api/cron/rss-feeds`.
- **Config**: Feeds are seeded from `scripts/campaigns.json` (one entry per feed URL).

## 1. Run the migration

```bash
mysql -u YOUR_USER -p zox_db < scripts/migrations/add-rss-feeds.sql
```

Or run the SQL in `scripts/migrations/add-rss-feeds.sql` in your DB client.

## 2. Configure campaigns/feeds

Edit `scripts/campaigns.json`. Each object can have:

- `camp_name`: Display name for the feed.
- `feeds`: One or more RSS URLs (space- or newline-separated).

Example (NYTimes Tech is already there):

```json
[
  {
    "camp_name": "NYTimes - Tech",
    "feeds": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"
  }
]
```

## 3. Seed RSS feeds into the DB

```bash
npm run db:seed-rss-feeds
```

This inserts rows into `rss_feeds` (using the first category and first admin user for new posts).

## 4. Environment variables

In `.env.local` (for both the app and the cron script):

- **DB**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **S3**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `S3_IMAGE_BASE_URL` (and optionally `S3_UPLOAD_PREFIX`)
- **Cron API** (if using HTTP): `CRON_SECRET` – set a secret and pass it as `?secret=...` when calling the cron URL.

## 5. Schedule the cron (every 10 minutes)

**Option A – HTTP (app must be running)**

```bash
# Every 10 minutes
*/10 * * * * curl -s "https://YOUR_DOMAIN/api/cron/rss-feeds?secret=YOUR_CRON_SECRET"
```

**Option B – Run the script directly (no server needed)**

```bash
*/10 * * * * cd /path/to/zox-nextjs && npx tsx scripts/cron-fetch-rss-feeds.ts >> /var/log/rss-cron.log 2>&1
```

See `scripts/crontab-rss-feeds.example` for copy-paste examples.

## 6. Manual run

- **Via API**:  
  `GET https://YOUR_DOMAIN/api/cron/rss-feeds?secret=YOUR_CRON_SECRET`
- **Via script**:  
  `npm run cron:rss-feeds`

## Flow

1. Cron (script or API) calls `RssFeedsService.processAllFeeds()`.
2. For each enabled feed, it fetches the RSS, finds items not yet in `rss_feed_items`.
3. For each new item it: fetches the article page, extracts content and images, uploads images to S3, replaces image URLs in the content with S3 URLs, then creates a post in `posts`.
4. The website already reads from `posts`; new posts appear in the list and images load from S3.

## Adding more feeds

1. Add entries to `scripts/campaigns.json` (with `feeds` URLs).
2. Run `npm run db:seed-rss-feeds` again (existing URLs are skipped).
3. No code change needed; the next cron run will pick up the new feed.
