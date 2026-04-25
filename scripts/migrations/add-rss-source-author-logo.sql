-- Add author (from RSS item) and feed logo for single-post source attribution.
-- Run: mysql -u ... -p zox_db < scripts/migrations/add-rss-source-author-logo.sql

USE zox_db;

-- Feed logo/source image (from RSS channel <image>)
ALTER TABLE rss_feeds
  ADD COLUMN logo_url VARCHAR(500) NULL COMMENT 'Feed/source logo from RSS channel image' AFTER url;

-- Original article author (from item creator/dc:creator)
ALTER TABLE rss_feed_items
  ADD COLUMN author VARCHAR(500) NULL COMMENT 'Original author from RSS item' AFTER link;
