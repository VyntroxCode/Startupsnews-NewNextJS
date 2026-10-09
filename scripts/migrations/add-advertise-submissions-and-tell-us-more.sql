-- Advertise With Us → Sales Tracker, and an optional "Tell us more" message on the lead forms.
--
-- 1. advertise_submissions: the raw record of every /advertise-with-us enquiry. Until this table
--    existed the form only sent an email (see app/api/advertise/route.ts), so an enquiry whose mail
--    was missed left no trace. Each one is also mirrored into sales_leads (see
--    modules/advertise-submissions/service/to-sales-lead.ts) as an "Advertise Page Leads" lead.
-- 2. tell_us_more on feature_startup_submissions / funding_round_submissions /
--    press_release_submissions: the optional free-text box those three forms now end with.
-- 3. sales_leads: tell_us_more (what the visitor wrote, shown read-only in the lead window — the
--    server writes it on insert only) plus budget_range / campaign_goal, which only an Advertise
--    lead fills.
--
-- THE APP NEEDS THIS BEFORE THE NEW CODE RUNS: SalesTrackerRepository.upsertLead names the three new
-- sales_leads columns, so every lead save (public forms and the admin lead window) fails until
-- they exist.
--
-- Additive only (one new table, new nullable columns), safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-advertise-submissions-and-tell-us-more.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS advertise_submissions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    country VARCHAR(120) NULL,
    city VARCHAR(120) NULL,
    budget_range VARCHAR(120) NOT NULL,
    campaign_goal VARCHAR(255) NOT NULL,
    tell_us_more TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE feature_startup_submissions ADD COLUMN IF NOT EXISTS tell_us_more TEXT NULL AFTER city;
ALTER TABLE funding_round_submissions ADD COLUMN IF NOT EXISTS tell_us_more TEXT NULL AFTER city;
ALTER TABLE press_release_submissions ADD COLUMN IF NOT EXISTS tell_us_more TEXT NULL AFTER city;

ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS budget_range VARCHAR(120) NULL AFTER description,
  ADD COLUMN IF NOT EXISTS campaign_goal VARCHAR(255) NULL AFTER budget_range,
  ADD COLUMN IF NOT EXISTS tell_us_more TEXT NULL AFTER campaign_goal;
