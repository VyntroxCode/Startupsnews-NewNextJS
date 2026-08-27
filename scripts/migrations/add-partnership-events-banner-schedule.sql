-- Schedules the Partnership Tracker's "Event banner (homepage)" image: the banner is only
-- pushed live to the homepage carousel once banner_start_date arrives (never before), and
-- banner_id remembers the auto-managed `banners` row so re-saving updates it in place
-- instead of piling up duplicates (same pattern as event_id / the linked public Event).
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-banner-schedule.sql

USE zox_db;

ALTER TABLE partnership_events
  ADD COLUMN banner_start_date DATE NULL AFTER banner_url,
  ADD COLUMN banner_id INT NULL AFTER banner_start_date,
  ADD INDEX idx_banner_id (banner_id);
