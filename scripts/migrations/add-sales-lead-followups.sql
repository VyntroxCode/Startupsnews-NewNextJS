-- My Leads follow-ups: what an assigned employee logged against a Sales Tracker lead.
--
-- One row per follow-up. Keyed like sales_lead_assignments:
--   lead_source = 'lead' → lead_id is sales_leads.id
--   lead_source = 'ens'  → lead_id is ens_travel_enquiries.id
--
-- credential_id is the author's hr_employee_credentials.id; author_name is a snapshot of their name
-- at the time, so the history still reads correctly after a rename or offboarding.
-- status is the status the employee set WITH this follow-up (contacted / interested /
-- not-interested / closed); the employee's current status lives on their
-- sales_lead_assignments.status row, which the same save updates.
-- created_at is the follow-up's date — set by the database, never sent by (or editable in) the UI.
--
-- Deleting a lead in the Sales Tracker deletes its follow-ups (SalesTrackerRepository.deleteLead).
--
-- Additive only, safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sales-lead-followups.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS sales_lead_followups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_source VARCHAR(10) NOT NULL,
  lead_id VARCHAR(40) NOT NULL,
  credential_id INT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead (lead_source, lead_id),
  INDEX idx_author (credential_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
