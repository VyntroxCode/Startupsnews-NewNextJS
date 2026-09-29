-- Events Tracker (formerly Partnership Tracker): "Follow Up" notes on each event.
--
-- One row per note an admin adds from the Add/Edit event form — a short record of what happened
-- in the conversation with the organiser, for the team's own knowledge. Never shown on the site.
--
--   created_at is stamped by the database when the note is added and is never updated: notes
--   have no edit path, so the date on a note is always the day it was written.
--   created_by is the admin's name (or email) at the time, kept as text like sales_lead_assignments.assigned_by.
--
-- Only the 5 newest notes per event are kept. PartnershipEventFollowUpsRepository.add() deletes
-- anything older in the same transaction as the insert, so the table never holds a 6th.
--
-- ON DELETE CASCADE: deleting an event (single or bulk) removes its notes with it.
--
-- Additive only, safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-event-follow-ups.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS partnership_event_follow_ups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  partnership_event_id INT NOT NULL,
  message TEXT NOT NULL,
  created_by VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_created (partnership_event_id, created_at),
  CONSTRAINT fk_follow_up_event FOREIGN KEY (partnership_event_id)
    REFERENCES partnership_events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
