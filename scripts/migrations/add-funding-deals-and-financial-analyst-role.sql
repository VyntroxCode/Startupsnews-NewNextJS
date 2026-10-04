-- Funding Intelligence (Phase 1): the funding-round dataset shown on the reader dashboard's Funding page
-- (/dashboard/funding), managed from /admin/funding-data by the new Financial Analyst panel role
-- (and the super admin).
--
--   * panel_admins.role gains 'financial_analyst'.
--   * hr_employee_credentials.panel_role is widened to the full panel-role set (it was left at
--     event_admin/publisher_admin when it_support was added, while the TypeScript type already had it).
--   * funding_upload_batches — one row per Excel/CSV upload, so a bad upload can be undone as a whole.
--   * funding_deals — one row per funding round. amount_usd_mn is NULL when undisclosed.
--     dedupe_key = date|lower(startup)|lower(stage); uploads use INSERT IGNORE so a re-upload never
--     duplicates a deal.
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-funding-deals-and-financial-analyst-role.sql

USE zox_db;

ALTER TABLE panel_admins
  MODIFY COLUMN role ENUM('event_admin', 'publisher_admin', 'it_support', 'financial_analyst') NOT NULL;

ALTER TABLE hr_employee_credentials
  MODIFY COLUMN panel_role ENUM('event_admin', 'publisher_admin', 'it_support', 'financial_analyst') NULL;

CREATE TABLE IF NOT EXISTS funding_upload_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_name VARCHAR(255) NOT NULL,
  rows_total INT NOT NULL DEFAULT 0,
  rows_inserted INT NOT NULL DEFAULT 0,
  rows_skipped INT NOT NULL DEFAULT 0,
  rows_invalid INT NOT NULL DEFAULT 0,
  uploaded_by VARCHAR(255) NULL,
  uploaded_by_role VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS funding_deals (
  id INT PRIMARY KEY AUTO_INCREMENT,
  deal_date DATE NOT NULL,
  startup_name VARCHAR(255) NOT NULL,
  sector VARCHAR(150) NULL,
  business_model VARCHAR(50) NULL,
  round_stage VARCHAR(100) NULL,
  amount_usd_mn DECIMAL(14,3) NULL,
  amount_raw VARCHAR(100) NULL,
  city VARCHAR(150) NULL,
  country VARCHAR(100) NULL,
  lead_investor VARCHAR(255) NULL,
  investors TEXT NULL,
  source_url VARCHAR(1000) NULL,
  batch_id INT NULL,
  dedupe_key VARCHAR(400) NOT NULL,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dedupe (dedupe_key),
  INDEX idx_date (deal_date),
  INDEX idx_country_date (country, deal_date),
  INDEX idx_sector (sector),
  INDEX idx_batch (batch_id),
  CONSTRAINT fk_funding_deals_batch FOREIGN KEY (batch_id) REFERENCES funding_upload_batches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
