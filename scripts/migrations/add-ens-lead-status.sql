-- Expand North Star enquiries: the sales team's own record of where each conversation stands.
--
-- lead_status is one of the values in modules/ens-travel-enquiries/domain/lead-status.ts
-- (confirmed, followed-up, cancelled); NULL means no conversation has been logged yet — the state
-- every new enquiry starts in. conversation_note is what came out of the last conversation, and is
-- only kept while the status is "followed-up" (the repository blanks it for any other status).
--
-- The Sales Tracker's "Expand North Star enquiries" card sets both from its edit dialog and reads
-- them for its "Followed Up Leads" tile (followed-up + not yet contacted) and its Lead status
-- filter and column.
--
-- Additive only (two nullable columns + an index), safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-ens-lead-status.sql
USE zox_db;

ALTER TABLE ens_travel_enquiries
  ADD COLUMN IF NOT EXISTS lead_status VARCHAR(20) NULL AFTER requirement,
  ADD COLUMN IF NOT EXISTS conversation_note TEXT NULL AFTER lead_status,
  ADD INDEX IF NOT EXISTS idx_lead_status (lead_status);
