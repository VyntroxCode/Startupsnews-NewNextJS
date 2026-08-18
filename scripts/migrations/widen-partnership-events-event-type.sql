-- Partnership Tracker: `event_type` now stores the repurposed "Partnership Type"
-- dropdown (Media Partnership / Ticketing Partnership / No Partnership) instead of the
-- old Free/Paid ticketing value — "Ticketing Partnership" (21 chars) no longer fits VARCHAR(20).
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/widen-partnership-events-event-type.sql
USE zox_db;

ALTER TABLE partnership_events
    MODIFY COLUMN event_type VARCHAR(50) NULL;
