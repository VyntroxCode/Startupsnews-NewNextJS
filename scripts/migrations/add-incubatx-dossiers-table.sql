-- IncubatX Startup Dossier submissions (from /incubatx/startup-details) — the full profile a
-- startup fills in once so the IncubatX team can reuse it across multiple grant applications
-- (DPIIT, state startup schemes, etc.) instead of re-collecting the same 20 answers each time.
--
-- Money columns store INTEGER RUPEES, not paise, matching the client-side zod schema
-- (lib/validation/incubatx-dossier.ts) which parses Indian-shorthand input ("4.5L", "2Cr") into
-- plain rupee integers capped at 1e12 — that cap overflows a 32-bit INT's ~2.1B ceiling, which is
-- why these are BIGINT UNSIGNED rather than INT.
--
-- No migration-tracking table exists in this repo (see other files under scripts/migrations/) —
-- idempotency is via CREATE TABLE IF NOT EXISTS only, applied by hand.
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-incubatx-dossiers-table.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS incubatx_dossiers (
  id                        INT AUTO_INCREMENT PRIMARY KEY,
  -- Backfilled right after insert with an id-derived value ("IX-2026-0142") — nullable until
  -- then so the insert itself never has to guess its own future reference.
  reference                 VARCHAR(20) NULL,
  status                    ENUM('pending','reviewed','accepted','rejected') NOT NULL DEFAULT 'pending',

  -- Identity (Q1-5)
  startup_name              VARCHAR(120) NOT NULL,
  website_url               VARCHAR(2048) NOT NULL,
  email                     VARCHAR(254) NOT NULL,
  mobile_e164               VARCHAR(20) NOT NULL,
  mobile_iso                VARCHAR(2) NULL,
  founders                  JSON NOT NULL,

  -- Positioning (Q6-9)
  stage                     ENUM('Idea','Prototype','MVP','Early Revenue','Growth Stage') NOT NULL,
  sector                    VARCHAR(60) NOT NULL,
  linkedin                  JSON NOT NULL,
  description               TEXT NOT NULL,

  -- Market & Model (Q10-12)
  market_opportunity        TEXT NOT NULL,
  business_model            TEXT NOT NULL,
  monthly_revenue           BIGINT UNSIGNED NOT NULL DEFAULT 0,
  annual_revenue            BIGINT UNSIGNED NOT NULL DEFAULT 0,
  customer_count            INT UNSIGNED NOT NULL DEFAULT 0,
  -- Generated at insert time so the row stays exportable back to the Google Form's single-string
  -- shape without re-deriving it from the three structured columns every time.
  traction_summary          VARCHAR(500) NULL,

  -- Financials & Team (Q13-15)
  revenue_last_fy           BIGINT UNSIGNED NOT NULL DEFAULT 0,
  has_raised                TINYINT(1) NOT NULL DEFAULT 0,
  total_funding_raised      BIGINT UNSIGNED NULL,
  funding_summary           VARCHAR(500) NULL,
  full_time_count           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  part_time_count           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  team_summary              VARCHAR(255) NULL,

  -- Documents (Q16-20) — dpiit is the only required one, everything else nullable.
  company_profile_url       VARCHAR(500) NULL,
  company_profile_filename  VARCHAR(150) NULL,
  incorporation_cert_url    VARCHAR(500) NULL,
  incorporation_cert_filename VARCHAR(150) NULL,
  dpiit_cert_url            VARCHAR(500) NOT NULL,
  dpiit_cert_filename       VARCHAR(150) NOT NULL,
  state_startup_cert_url    VARCHAR(500) NULL,
  state_startup_cert_filename VARCHAR(150) NULL,
  gst_cert_url              VARCHAR(500) NULL,
  gst_cert_filename         VARCHAR(150) NULL,

  -- Anti-abuse / audit trail — no existing precedent for IP-hashing or user-agent capture
  -- elsewhere in this repo, established fresh for this form.
  client_ip_hash            VARCHAR(64) NULL,
  user_agent                VARCHAR(500) NULL,
  submitted_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_reference (reference),
  INDEX idx_status (status),
  INDEX idx_submitted_at (submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
