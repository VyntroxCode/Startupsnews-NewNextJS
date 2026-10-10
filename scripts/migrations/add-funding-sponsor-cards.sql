-- Funding sponsor cards: the row of up to three cards at the top of the reader Funding Dashboard
-- (/dashboard/funding), managed by the super admin from /admin/user-management.
--
--   * At most 5 rows, at most 3 with is_active = 1. Both limits are enforced in the API
--     (modules/funding-sponsor-cards), not by the schema.
--   * image_url is NULL when the card has no logo (the reader card falls back to an icon).
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-funding-sponsor-cards.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS funding_sponsor_cards (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  subtitle VARCHAR(400) NOT NULL DEFAULT '',
  image_url VARCHAR(1000) NULL,
  link_url VARCHAR(1000) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
