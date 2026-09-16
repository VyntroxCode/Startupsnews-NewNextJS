-- Feature Your Startup: store every /feature-your-startup form submission as the raw record of
-- what was submitted. Each one is also mirrored into sales_leads (see
-- modules/feature-startup-submissions/service/to-sales-lead.ts) so the team works it from the
-- admin Sales Tracker's general "All leads" table, under its "Filter: page leads" filter.
--
-- Until this table existed the form's Submit button saved nothing — it only showed the thank-you
-- screen. Columns mirror the form exactly: phone is stored composed ("+91 9876543210"), country and
-- city are stored separately (the resolved dropdown value, or what was typed under "Other").
--
-- Additive only (a new table), safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-feature-startup-submissions-table.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS feature_startup_submissions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(500) NULL,
    country VARCHAR(120) NULL,
    city VARCHAR(120) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
