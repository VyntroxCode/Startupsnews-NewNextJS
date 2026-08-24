-- "Inner Pages" admin section (sidebar → Inner Pages → Our Partners): lets an admin manage the
-- partner logos + link and the intro copy on /our-partners instead of both being hardcoded in
-- the page itself.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partner-logos-and-inner-pages.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS partner_logos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- One of: 'Indian Partnerships', 'International Events', 'International Events Organisers',
  -- 'e-Cell Partnerships' — which horizontal row on /our-partners this logo appears in.
  section VARCHAR(60) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  -- Where clicking the logo goes — nullable, an un-linked logo just isn't clickable.
  link_url VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  INDEX idx_partner_logos_section (section, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per editable "inner page" (page_key is a stable slug like 'our-partners') — just the
-- rich-text intro copy for now; more inner pages can reuse this same table later by page_key.
CREATE TABLE IF NOT EXISTS inner_page_content (
  page_key VARCHAR(60) PRIMARY KEY,
  content_html LONGTEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
