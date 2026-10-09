-- Sales Tracker: a "Next follow-up date" per person on every lead, feeding the "Today's Follow up" KPI.
--
-- Each person keeps their own date on a lead:
--   - the admin's date is the lead's own column: sales_leads.next_follow_up_date (already there)
--     and, new here, ens_travel_enquiries.next_follow_up_date for an Expand North Star enquiry;
--   - an assigned employee's date is sales_lead_assignments.next_follow_up_date — one per
--     (lead, employee), set by the follow-up they log from My Leads, gone when they leave the lead.
-- sales_lead_followups.next_follow_up_date keeps the date picked with each history entry, so the
-- log shows what was planned at the time. It is history only; nothing reads it for the KPI.
--
-- NULL = no date set. A lead only counts as due while it is still open (Pending / Follow Up).
--
-- Also here: sales_lead_followups.changes — the edit history. When an admin's save changes the lead
-- (a detail field, the status, their next follow-up date, or who is assigned), the history entry
-- for that save carries a JSON array of {"field","from","to"} — what changed, old value → new value.
-- NULL on every other entry (employee follow-ups, and anything saved before this column existed).
--
-- Additive only (four new nullable columns + one index), safe to re-run.
-- Run once: docker exec -i zox-mariadb mariadb -u zox_user -p zox_db < scripts/migrations/add-next-follow-up-dates.sql
USE zox_db;

ALTER TABLE sales_lead_assignments
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE NULL AFTER status,
  ADD INDEX IF NOT EXISTS idx_next_follow_up (credential_id, next_follow_up_date);

ALTER TABLE sales_lead_followups
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE NULL AFTER note,
  ADD COLUMN IF NOT EXISTS changes TEXT NULL AFTER next_follow_up_date;

ALTER TABLE ens_travel_enquiries
  ADD COLUMN IF NOT EXISTS next_follow_up_date DATE NULL AFTER conversation_note;
