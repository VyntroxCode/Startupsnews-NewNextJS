-- Add feed_for field to rss_feeds: controls whether the feed is used for website, newsletter, or both.
-- Run once: mysql -u ... -p zox_db < scripts/migrations/add-rss-feed-for.sql

USE zox_db;

ALTER TABLE rss_feeds
  ADD COLUMN feed_for SET('website','newsletter') NOT NULL DEFAULT 'website'
  AFTER auto_publish;
