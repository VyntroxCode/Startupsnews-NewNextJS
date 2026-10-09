-- Sales Tracker lead messages: who each message was sent to, and whether they have seen it.
--
-- Until now a message (sales_lead_messages) was simply shown to everyone on the lead and nothing
-- recorded who had read it. This table adds one row per person a message was SENT to:
--
--   targeted = 0 → the admin sent it to everyone on the lead; the rows are the people assigned at
--                  that moment. People assigned later can still read the message in the lead, but
--                  were never notified, so they have no row.
--   targeted = 1 → the admin ticked specific people; ONLY the people with a row can read it.
--
--   seen_at NULL = not seen yet. It is stamped the first time that person opens the lead in
--   My Leads. "Pending messages" (My Leads tile, new-message pop-up) = rows with seen_at NULL for
--   the reader, on leads they are still assigned to.
--
-- credential_id is hr_employee_credentials.id, the same id sales_lead_assignments stores.
-- employee_name is a snapshot for the admin's "To: …" line, so it still reads after a rename.
--
-- Messages sent before this table existed have no rows: they stay visible to everyone on the lead
-- and count as already seen (no back-fill on purpose — nobody gets a flood of old alerts).
--
-- The foreign key removes a message's rows when the message is deleted (deleting a lead deletes
-- its messages — SalesTrackerRepository.deleteLead).
--
-- Additive only, safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sales-lead-message-recipients.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS sales_lead_message_recipients (
  message_id INT NOT NULL,
  credential_id INT NOT NULL,
  employee_name VARCHAR(255) NOT NULL DEFAULT '',
  targeted TINYINT(1) NOT NULL DEFAULT 0,
  seen_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (message_id, credential_id),
  INDEX idx_unseen (credential_id, seen_at),
  CONSTRAINT fk_slmr_message FOREIGN KEY (message_id) REFERENCES sales_lead_messages (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
