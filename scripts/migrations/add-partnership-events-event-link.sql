-- Links a Partnership Tracker record to its auto-managed public-facing Event row, so
-- filling out Partnership Tracker (region + Draft/Published/Cancelled) is the only entry
-- point needed — no more filling near-identical fields a second time in Events.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-event-link.sql

USE zox_db;

ALTER TABLE partnership_events
  ADD COLUMN event_id INT NULL AFTER id,
  ADD INDEX idx_event_id (event_id);
