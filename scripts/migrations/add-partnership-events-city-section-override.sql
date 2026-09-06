-- Partnership Tracker: manual override for which /events section a city's events render under.
--
-- /events normally decides this on its own: a city gets its own carousel when it is curated for
-- its country (COUNTRY_CITY_DATA) or has reached AUTO_SECTION_MIN_EVENTS listed events, and
-- otherwise shares the country's "Other Cities" carousel. This column lets an admin overrule that
-- from the Edit Event modal.
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
USE zox_db;

ALTER TABLE partnership_events
    ADD COLUMN city_section_override VARCHAR(10) NULL DEFAULT NULL
    COMMENT 'auto (NULL) | own | other — /events city section override, applied city-wide'
    AFTER city;
