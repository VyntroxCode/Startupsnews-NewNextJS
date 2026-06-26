-- Newsletter items snapshot table: refreshed on each morning signal run.
-- Run once: mysql -u ... -p zox_db < scripts/migrations/add-newsletter-items.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS newsletter_items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rss_feed_id   INT UNSIGNED NULL,
  feed_name     VARCHAR(255) NULL,
  feed_url      VARCHAR(500) NULL,
  feed_logo_url VARCHAR(500) NULL,
  category_slug VARCHAR(120) NULL,
  title         TEXT NOT NULL,
  link          VARCHAR(500) NOT NULL,
  image_url     VARCHAR(500) NULL,
  description   TEXT NULL,
  published_at  DATETIME NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category_published (category_slug, published_at),
  INDEX idx_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
