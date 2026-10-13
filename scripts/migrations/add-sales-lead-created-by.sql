-- Sales Tracker: who created each lead.
--
-- Until now only the admin Sales Tracker could add a lead by hand, so nothing recorded who did it.
-- Employees (and Event / Publisher Admins) can now add leads from My Leads, so each sales_leads row
-- keeps its creator:
--   - created_by_credential_id: the HR login (hr_employee_credentials.id) of the employee who added
--     the lead from My Leads. NULL for a lead added by an admin in the Sales Tracker, a lead that
--     came from a website form, and every lead from before this column existed. This is what gives
--     the creator access to the lead in My Leads (view, edit, follow up) even when they are not one
--     of the assigned people.
--   - created_by_name: the creator's name at the time, as shown in the "Created by" column — the
--     employee's or the admin's. NULL for website leads and older leads.
-- Both are written once, when the lead is inserted, and never changed by a later save.
--
-- Additive only (two new nullable columns + one index), safe to re-run.
-- The new code reads these columns, so run this BEFORE building it.
-- Run once: docker exec -i zox-mariadb mariadb -u zox_user -p zox_db < scripts/migrations/add-sales-lead-created-by.sql
USE zox_db;

ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS created_by_credential_id INT UNSIGNED NULL AFTER last_call_discussion,
  ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255) NULL AFTER created_by_credential_id,
  ADD INDEX IF NOT EXISTS idx_created_by_credential (created_by_credential_id);
