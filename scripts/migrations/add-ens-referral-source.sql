-- Expand North Star enquiries: where each enquiry came from — the two source fields added to the
-- closing form on /expand-north-star on 2026-09-19.
--
-- referred_by is one of the partner values in modules/ens-travel-enquiries/domain/sources.ts
-- (REFERRED_BY_OPTIONS); NULL means the visitor named no referrer, which is the common case.
-- found_us is one of FOUND_US_OPTIONS (instagram, linkedin, …, others); found_us_detail is the
-- visitor's own words and is only set when found_us = 'others'. Rows from before this migration
-- have NULL in all three; the service reads such a row as "others" with no detail.
--
-- The Sales Tracker's "Expand North Star enquiries" card shows both as columns, filters on the
-- referrer, and edits them from its dialog; the notification email carries them too.
--
-- Additive only (three nullable columns + an index), safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-ens-referral-source.sql
USE zox_db;

ALTER TABLE ens_travel_enquiries
  ADD COLUMN IF NOT EXISTS referred_by VARCHAR(40) NULL AFTER requirement,
  ADD COLUMN IF NOT EXISTS found_us VARCHAR(40) NULL AFTER referred_by,
  ADD COLUMN IF NOT EXISTS found_us_detail VARCHAR(200) NULL AFTER found_us,
  ADD INDEX IF NOT EXISTS idx_referred_by (referred_by);
