-- /events grouped by country by guessing it from the city name (REGION_COUNTRY, a small
-- hardcoded list) since `events` had no real country column — any city not on that list (e.g.
-- "Mathura") silently became its own top-level section instead of nesting under India. This adds
-- a real column, populated going forward from the partnership tracker's Region/Country field
-- (see PartnershipEventsService.syncLinkedEvent).
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-events-country.sql
USE zox_db;

ALTER TABLE events ADD COLUMN country VARCHAR(100) NULL AFTER location;
