-- Unified "All leads" table: adds the Sponsor Event–specific fields to sales_leads so a Sponsor
-- Event Page Lead can carry its full event record (title, schedule, poster, description, link)
-- on the same row the team already edits — not just the one-line summary it carried before.
--
-- Person/company/date/status/etc. fields are already generic columns on sales_leads and are
-- reused as-is; only the fields with no existing home get added here. Expand North Star enquiries
-- are NOT added to sales_leads by this migration — they stay in ens_travel_enquiries and are only
-- joined in at the display layer (see remove-ens-mirrored-sales-leads.sql for why they were taken
-- out of this table in the first place).
--
-- Safe to re-run: IF NOT EXISTS-style guards via ALTER ... ADD COLUMN IF NOT EXISTS.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sales-leads-event-fields.sql
USE zox_db;

ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS event_title VARCHAR(255) NULL AFTER query_text,
  ADD COLUMN IF NOT EXISTS event_slug VARCHAR(255) NULL AFTER event_title,
  ADD COLUMN IF NOT EXISTS event_date VARCHAR(10) NULL AFTER event_slug,
  ADD COLUMN IF NOT EXISTS event_time VARCHAR(8) NULL AFTER event_date,
  ADD COLUMN IF NOT EXISTS external_url VARCHAR(1000) NULL AFTER event_time,
  ADD COLUMN IF NOT EXISTS poster_url VARCHAR(1000) NULL AFTER external_url,
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER poster_url;

-- One-time backfill: Sponsor Event leads mirrored into sales_leads before this migration only
-- carry a `query_text` summary — their new event_* columns are NULL. Fill them from the original
-- submission, which shares the same id (see sponsor-event-submissions/service/to-sales-lead.ts).
-- Data-only, safe to re-run (only touches rows that are still NULL).
UPDATE sales_leads sl
  JOIN sponsor_event_submissions ses ON ses.id = sl.id
   SET sl.event_title  = ses.event_title,
       sl.event_slug   = ses.event_slug,
       sl.event_date   = ses.event_date,
       sl.event_time   = ses.event_time,
       sl.external_url = ses.external_url,
       sl.poster_url   = ses.poster_url,
       sl.description  = ses.description
 WHERE sl.type = 'Sponsor Event Page Leads'
   AND sl.event_title IS NULL;
