# RSS Feed Cron – Documentation & Settings

This document describes the **RSS feed cron job**: what it does, how to run it, and all configurable settings.

---

## 1. Overview

| Item | Description |
|------|--------------|
| **Purpose** | Fetch RSS feeds on a schedule, create posts in the database, and upload article images to S3 so the website shows latest posts with images served from S3. |
| **Default schedule** | Every **10 minutes**. |
| **Entry points** | (1) **CLI script** – `scripts/cron-fetch-rss-feeds.ts` (2) **HTTP** – `GET /api/cron/rss-feeds`. |

### Images: S3 upload and DB storage

The cron **uploads all article images to S3** and **stores only S3 URLs in the database**:

1. **In-post images** – Every `<img>` in the article body is downloaded from the source URL, uploaded to your S3 bucket (under `S3_UPLOAD_PREFIX/uploads/YYYY/MM/rss-*.ext`), then the post **content** is saved with those **S3 URLs** in place of the original links. The site therefore serves images from S3, not the original source.
2. **Featured image** – The first in-article image (or the feed’s image) is uploaded to S3 and its S3 URL is stored in **`posts.featured_image_url`** and **`posts.featured_image_small_url`**.
3. **No original image URLs in DB** – Only S3 links are written to the `posts` table for both `content` and featured image fields.

Required env: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`, `S3_IMAGE_BASE_URL` (and optionally `S3_UPLOAD_PREFIX`). See [Environment variables](#4-environment-variables-settings) below.

---

## 2. How the Cron Runs

### Option A: Script (recommended for server cron)

- **Command**: `npx tsx scripts/cron-fetch-rss-feeds.ts`
- **NPM script**: `npm run cron:rss-feeds`
- **Requires**: `.env.local` loaded (DB + AWS credentials). The script uses `@next/env` to load `.env.local` from the project root.
- **Use case**: System crontab or any scheduler that runs a command; no web server needed.

### Option B: HTTP endpoint

- **URL**: `GET /api/cron/rss-feeds?secret=YOUR_CRON_SECRET`
- **Requires**: Next.js app running; `CRON_SECRET` set in env and passed as `secret` query parameter.
- **Use case**: External cron services (e.g. cron-job.org) or load-balanced environments where hitting an URL is easier than running a script.

---

## 3. Crontab & Schedule

### Install (recommended: system cron)

Install so the job runs every 10 min as user `ubuntu`:
```bash
sudo cp /path/to/zox-nextjs/scripts/cron.d-zox-rss.txt /etc/cron.d/zox-rss
sudo chmod 644 /etc/cron.d/zox-rss
```
Uses `scripts/run-rss-cron.sh`. No user crontab needed.

### Install (alternative: user crontab)

From the project root:

```bash
./scripts/install-rss-cron.sh
```

This appends a line to the current user’s crontab. Edit with `crontab -e` if you need to change it.

### Crontab line (script)

```cron
*/10 * * * * cd /path/to/zox-nextjs && /usr/bin/npx tsx scripts/cron-fetch-rss-feeds.ts >> /path/to/zox-nextjs/logs/rss-cron.log 2>&1
```

- Replace `/path/to/zox-nextjs` with the actual project path (the install script does this).
- Log file is in the project: `logs/rss-cron.log` (so the cron user can write without root).
- Runs every 10 minutes; stdout/stderr go to that log file.

### Crontab line (HTTP)

```cron
*/10 * * * * curl -s "https://YOUR_DOMAIN/api/cron/rss-feeds?secret=YOUR_CRON_SECRET"
```

- Replace `YOUR_DOMAIN` and `YOUR_CRON_SECRET` with your values.
- Optional: append `>> /var/log/rss-cron-http.log 2>&1` to log responses.

### Changing the schedule

| Schedule | Crontab field | Example |
|----------|----------------|--------|
| Every 10 minutes | `*/10 * * * *` | Default |
| Every 30 minutes | `*/30 * * * *` | |
| Every hour | `0 * * * *` | |
| Every 6 hours | `0 */6 * * *` | |
| Daily at 2am | `0 2 * * *` | |

---

## 4. Environment Variables (Settings)

Used by both the **script** and the **Next.js app** (for the API route). Put these in `.env.local` at the project root.

### Database (required for cron)

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MariaDB/MySQL host | `localhost` |
| `DB_PORT` | Port | `3306` |
| `DB_NAME` | Database name | `zox_db` |
| `DB_USER` | DB user | `zox_user` |
| `DB_PASSWORD` | DB password | (your password) |

### AWS S3 (required for image upload)

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | IAM access key | |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key | |
| `AWS_REGION` | Region for S3 | `us-east-1` |
| `S3_BUCKET` | Bucket name | `startupnews-media-2026` |
| `S3_IMAGE_BASE_URL` | Public base URL for images | `https://startupnews-media-2026.s3.us-east-1.amazonaws.com` |
| `S3_UPLOAD_PREFIX` | Optional path prefix in bucket | `startupnews-in` |

### Cron API (only if using HTTP)

| Variable | Description | Example |
|----------|-------------|---------|
| `CRON_SECRET` | Secret for `/api/cron/rss-feeds`; pass as `?secret=...` | Long random string |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `RSS_FETCH_TIMEOUT` | Timeout in ms for fetching an RSS feed | `30000` |

---

## 5. Database Settings (`rss_feeds` table)

Each row is one RSS feed. Seed from `scripts/campaigns.json` with `npm run db:seed-rss-feeds`, or insert/update via SQL.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key. |
| `name` | VARCHAR(255) | Display name (e.g. "NYTimes - Tech"). |
| `url` | VARCHAR(500) | RSS feed URL. |
| `category_id` | INT | Default category for new posts (FK to `categories`). |
| `author_id` | INT | Default author for new posts (FK to `users`). |
| `enabled` | TINYINT(1) | `1` = processed by cron, `0` = skipped. |
| `fetch_interval_minutes` | INT | Minimum minutes between fetches for this feed. |
| `last_fetched_at` | TIMESTAMP | Set after each run (success or failure). |
| `last_error` | TEXT | Last error message if the run failed. |
| `error_count` | INT | Consecutive failures (can be used to auto-disable). |
| `max_items_per_fetch` | INT | Max new items to process per run (e.g. 10). |
| `auto_publish` | TINYINT(1) | `1` = new posts created as published, `0` = draft. |
| `created_at` / `updated_at` | TIMESTAMP | Audit. |

**Examples**

- Disable a feed: `UPDATE rss_feeds SET enabled = 0 WHERE id = ?;`
- Change interval to 30 minutes: `UPDATE rss_feeds SET fetch_interval_minutes = 30 WHERE id = ?;`
- Limit to 5 items per run: `UPDATE rss_feeds SET max_items_per_fetch = 5 WHERE id = ?;`

---

## 6. Feed Source: `scripts/campaigns.json`

Feeds are **seeded** from this file (they are not read on every cron run). After editing, run:

```bash
npm run db:seed-rss-feeds
```

- Duplicate URLs are skipped (no duplicate rows).
- New feeds are inserted with: first category, first admin user, `enabled=1`, `fetch_interval_minutes=10`, `max_items_per_fetch=10`, `auto_publish=1`.

**Format**

```json
[
  {
    "camp_name": "NYTimes - Tech",
    "feeds": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"
  },
  {
    "camp_name": "Another Feed",
    "feeds": "https://example.com/feed.xml https://example.com/feed2.xml"
  }
]
```

- `feeds`: one or more URLs, space- or newline-separated.
- Other keys (e.g. `camp_id`, `camp_post_title`) are ignored by the seed script.

---

## 7. Logs & Output

### Script run

- **Default log file** (when using install script): `logs/rss-cron.log` in the project directory (e.g. `/home/ubuntu/zox-nextjs/logs/rss-cron.log`).
- **Console output**: One line per run, e.g.  
  `RSS cron: processed=1 created=10 errors=0`
- **Errors**: If any feed fails, errors are listed after the summary line.

### API run

- Response JSON: `{ success, processed, created, errors[] }`
- Server logs: Check your Next.js / process manager logs for stack traces.

### Rotating logs (optional)

If you use the script and want to avoid unbounded log growth:

```bash
# Example: keep last 7 days
0 0 * * * truncate -s 0 /var/log/rss-cron.log
```

Or use `logrotate` with a config for `/var/log/rss-cron.log`.

---

## 8. Manual Run

| Method | Command / URL |
|--------|----------------|
| Script | `npm run cron:rss-feeds` or `npx tsx scripts/cron-fetch-rss-feeds.ts` |
| API | `curl "https://YOUR_DOMAIN/api/cron/rss-feeds?secret=YOUR_CRON_SECRET"` |

---

## 9. Files Reference

| File | Purpose |
|------|---------|
| `scripts/cron-fetch-rss-feeds.ts` | Cron entry script (loads env, runs service, closes DB). |
| `scripts/seed-rss-feeds.ts` | Seeds `rss_feeds` from `campaigns.json`. |
| `scripts/campaigns.json` | Feed URLs and names for seeding. |
| `scripts/install-rss-cron.sh` | Adds the 10-minute crontab line (script method). |
| `scripts/crontab-rss-feeds.example` | Example crontab lines (script + HTTP). |
| `scripts/migrations/add-rss-feeds.sql` | Creates `rss_feeds` and `rss_feed_items`. |
| `src/app/api/cron/rss-feeds/route.ts` | HTTP cron endpoint. |
| `src/modules/rss-feeds/` | Parser, S3 upload, post creator, service. |

---

## 10. Troubleshooting

| Issue | What to check |
|-------|----------------|
| No posts created | Feeds enabled? (`enabled=1`). New items in feed? (already-processed items are skipped.) DB + S3 env vars set? |
| Cron not running | Use **system cron**: `sudo cp scripts/cron.d-zox-rss.txt /etc/cron.d/zox-rss`. Ensure `cron` daemon is running: `systemctl is-active cron`. Check log: `tail -f logs/rss-cron.log` and wait for the next :00, :10, :20, etc. |
| “Unauthorized” on API | `CRON_SECRET` in env matches `?secret=...` in the request. |
| S3/upload errors | `AWS_*` and `S3_*` in `.env.local`. IAM key has `s3:PutObject` (and if you use HeadBucket, `s3:ListBucket`) on the bucket. |
| Script “module not found” | Run from project root; `npm install` done; use `npx tsx` so TS is run correctly. |
| Log file missing / cron not running | Cron runs as your user; it cannot write to `/var/log/` without root. Use the project log: `logs/rss-cron.log` (install script does this). Run `./scripts/install-rss-cron.sh` to fix the crontab. |

---

## 11. Summary Table: Cron Settings

| Setting | Where | Default / note |
|---------|--------|------------------|
| Schedule | Crontab | Every 10 min (`*/10 * * * *`) |
| Feed list | DB `rss_feeds` | Seeded from `campaigns.json` |
| Per-feed interval | `rss_feeds.fetch_interval_minutes` | 10 |
| Items per run per feed | `rss_feeds.max_items_per_fetch` | 10 |
| New posts status | `rss_feeds.auto_publish` | 1 (published) |
| RSS timeout | Env `RSS_FETCH_TIMEOUT` | 30000 ms |
| Cron API auth | Env `CRON_SECRET` + query `secret` | Required if `CRON_SECRET` set |

For initial setup (migration, seed, first run), see **RSS_CRON_SETUP.md** in the project root.
