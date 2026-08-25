-- HR Management → Company Profile → "Registered details" card was previously three hardcoded
-- strings baked into Company.tsx with no way to edit them. This table makes them a real,
-- editable, persisted singleton row (id = 1), same pattern as hr_rules.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-company-profile.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS hr_company_profile (
  id INT PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(255) NOT NULL,
  cin VARCHAR(100) NOT NULL,
  registered_state VARCHAR(100) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed with the exact values that used to be hardcoded, so nothing visually changes until an
-- admin actually edits them.
INSERT IGNORE INTO hr_company_profile (id, company_name, cin, registered_state) VALUES
  (1, 'DOTFYI Media Ventures Pvt. Ltd. (StartupNews.fyi)', 'U22100DL2022PTC403240', 'Delhi');
