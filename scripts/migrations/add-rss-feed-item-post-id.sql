-- Add post_id column to rss_feed_items if it was missing (CREATE TABLE IF NOT EXISTS skipped it).
-- Run: mysql -u ... -p zox_db < scripts/migrations/add-rss-feed-item-post-id.sql

USE zox_db;

-- Add post_id if missing (safe to run multiple times - will error only if already exists; use the IF NOT EXISTS guard)
ALTER TABLE rss_feed_items
  ADD COLUMN IF NOT EXISTS post_id INT NULL AFTER processed,
  ADD CONSTRAINT IF NOT EXISTS fk_rss_feed_items_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL;

-- Backfill: link existing rss_feed_items rows to posts by matching title (best-effort).
-- Only links records where a single unambiguous post match exists.
UPDATE rss_feed_items i
INNER JOIN (
  SELECT title, MIN(id) AS post_id
  FROM posts
  GROUP BY title
  HAVING COUNT(*) = 1
) p ON p.title = i.title
SET i.post_id = p.post_id, i.processed = 1
WHERE i.post_id IS NULL;
