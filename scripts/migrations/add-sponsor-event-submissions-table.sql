-- Partner / Sponsor an Event: store every /sponsor-event form submission. Until this table existed
-- the form only emailed office@startupnews.fyi and saved nothing, so a missed email meant a lost
-- request and the admin panel had no record of any of them.
--
-- The admin Sales Tracker reads this table for its own "Sponsor Event submissions" card (KPI tiles
-- → table → full-detail view with the poster), because these fields — event title, date, time,
-- poster, description — don't fit the general leads table. Each submission is ALSO mirrored into
-- sales_leads (see modules/sponsor-event-submissions/service/to-sales-lead.ts) so the team can work
-- it like any other lead (status, assignee, follow-ups) under "Filter: page leads".
--
-- event_date / event_time are VARCHAR on purpose: they are exactly what the form's date and time
-- inputs send ("2026-10-01", "18:30"), and the mariadb driver would turn a DATE column into a JS
-- Date shifted by the server timezone.
--
-- Additive only (a new table), safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sponsor-event-submissions-table.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS sponsor_event_submissions (
    id VARCHAR(40) PRIMARY KEY,
    event_title VARCHAR(255) NOT NULL,
    event_slug VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    country VARCHAR(120) NULL,
    city VARCHAR(120) NULL,
    external_url VARCHAR(1000) NULL,
    event_date VARCHAR(10) NOT NULL,
    event_time VARCHAR(8) NOT NULL,
    description TEXT NOT NULL,
    poster_url VARCHAR(1000) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_event_date (event_date),
    INDEX idx_contact_email (contact_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
