-- Backend-only audit trail: who created/last-modified each admin-panel record.
-- Stored as email (not a numeric FK) since actors can come from either `users`
-- or `panel_admins`, which have independent auto-increment ids.
-- Never surfaced in the admin UI — DB/API only.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-audit-columns.sql

USE zox_db;

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE event_regions
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE rss_feeds
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE admin_tools
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE report_sections
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE newsletter_categories
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE newsletter_schedules
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;

ALTER TABLE panel_admins
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) NULL;
