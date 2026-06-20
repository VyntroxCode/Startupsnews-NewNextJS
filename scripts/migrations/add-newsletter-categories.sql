-- Newsletter categories: admin-defined labels for organizing newsletter content.
-- Run once: mysql -u ... -p zox_db < scripts/migrations/add-newsletter-categories.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS newsletter_categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120)  NOT NULL,
  slug        VARCHAR(120)  NOT NULL UNIQUE,
  description TEXT          NULL,
  color       VARCHAR(20)   NOT NULL DEFAULT '#6366f1',
  sort_order  INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sort (sort_order, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
