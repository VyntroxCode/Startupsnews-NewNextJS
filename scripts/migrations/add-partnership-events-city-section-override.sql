-- Partnership Tracker: manual override for which /events section a city's events render under.
--
-- /events normally decides this on its own: a city gets its own carousel once it has reached
-- AUTO_SECTION_MIN_EVENTS listed events, and otherwise shares the country's "Other Cities"
-- carousel. This column lets an admin overrule that.
--
--   NULL / ''  auto   — the default rule above decides (existing rows keep behaving exactly as now)
--   'own'             — always give this city its own carousel, even below the event threshold
--   'other'           — always keep this city in "Other Cities", even at or above the threshold
--
-- The setting is CITY-WIDE by design, not per-event: it is read off any event of the city, so a
-- city can never end up split across two sections on the page. It is stored per row purely
-- because that is where the admin edits it.
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-city-section-override.sql
--
-- APPLIED to zox_db on 2026-09-10. This file shipped with the feature code but was never run,
-- and because repository.create() writes every WRITABLE_COLUMNS entry unconditionally, the
-- missing column broke every WRITE to partnership_events — admin add, admin edit/save, the
-- public list-your-event submission, and new rows on CSV import — while all reads (SELECT *)
-- carried on working, which is why it went unnoticed. There is no migration-tracking table in
-- this repo, so re-running this would fail on the duplicate column; check first with:
--   SELECT COLUMN_NAME FROM information_schema.COLUMNS
--    WHERE TABLE_SCHEMA='zox_db' AND TABLE_NAME='partnership_events'
--      AND COLUMN_NAME='city_section_override';
USE zox_db;

ALTER TABLE partnership_events
    ADD COLUMN city_section_override VARCHAR(10) NULL DEFAULT NULL
    COMMENT 'auto (NULL) | own | other — /events city section override, applied city-wide'
    AFTER city;
