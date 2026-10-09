-- Internal messages on Sales Tracker leads: replies under an entry of the lead's history.
--
-- sales_lead_followup_replies — one row per reply. followup_id is the sales_lead_followups row it
-- sits under (an employee follow-up or an admin status update). lead_source / lead_id repeat that
-- row's lead so a lead's replies are read in one query. credential_id is the writer's
-- hr_employee_credentials.id, or 0 for an admin replying from the Sales Tracker (same convention as
-- sales_lead_followups); author_name is a snapshot of their name. created_at is set by the
-- database, never by the UI. Replies are never edited or deleted from the UI.
--
-- sales_lead_reply_seen — one row per (lead, employee): the highest reply id that employee had
-- seen when they last opened the lead in My Leads. An admin reply with a higher id is "new" for
-- them (pop-up + badge). Admins have no row: they get no alerts.
--
-- Deleting a lead in the Sales Tracker deletes both (SalesTrackerRepository.deleteLead).
--
-- Additive only, safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sales-lead-followup-replies.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS sales_lead_followup_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  followup_id INT NOT NULL,
  lead_source VARCHAR(10) NOT NULL,
  lead_id VARCHAR(40) NOT NULL,
  credential_id INT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead (lead_source, lead_id),
  INDEX idx_followup (followup_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_lead_reply_seen (
  lead_source VARCHAR(10) NOT NULL,
  lead_id VARCHAR(40) NOT NULL,
  credential_id INT NOT NULL,
  last_seen_reply_id INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (lead_source, lead_id, credential_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
