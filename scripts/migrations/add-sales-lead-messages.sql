-- Sales Tracker "Message for assigned employees": what an admin tells the people assigned to a lead
-- (e.g. "Call them before Friday and share the delegation deck").
--
-- One row per message; the lead window shows them as a history, newest first, and every employee
-- assigned to the lead reads the same messages in My Leads. Messages are never edited or deleted
-- from the UI — a new message is added instead. Keyed like sales_lead_assignments:
--   lead_source = 'lead' → lead_id is sales_leads.id
--   lead_source = 'ens'  → lead_id is ens_travel_enquiries.id
--
-- author_name is a snapshot of the admin's name (or email) at the time, so the history still reads
-- correctly after a rename. created_at is set by the database, never sent by the UI.
--
-- Deleting a lead in the Sales Tracker deletes its messages (SalesTrackerRepository.deleteLead).
--
-- Additive only, safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sales-lead-messages.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS sales_lead_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_source VARCHAR(10) NOT NULL,
  lead_id VARCHAR(40) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead (lead_source, lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
