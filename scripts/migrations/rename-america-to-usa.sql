-- Country label: "America" -> "USA" (2026-09-11, on request).
--
-- Background: the Region/Country dropdown listed the United States as "America" for a while, with
-- "USA" demoted to an alias (src/modules/partnership-events/domain/country-city-data.ts). It is
-- "USA" again — the spelling normalize-country-names.sql already folded every other variant into,
-- and the one the dev database holds throughout (partnership_events 12 rows, events 7, zero stored
-- as "America" at the time of writing).
--
-- Why a migration at all, then: while "America" was canonical, the admin Add/Edit Event form
-- snapped a reopened record to it (canonicalCountryName), so any row saved in that window on a
-- given database now STORES "America". The code keeps "America" as an alias, so such rows still
-- display and group as USA without this — but this rewrites them in one pass so the stored value
-- matches what the page shows, for records nobody plans to reopen.
--
-- Applies to both tables that hold the value, exactly as normalize-country-names.sql does:
-- partnership_events.country (the tracker's own field) and events.country (the public copy that
-- syncLinkedEvent writes). Updating both together is what keeps them consistent without going
-- through the app. contacts.country is deliberately NOT touched: it is a separate CRM field with
-- its own mapping (src/modules/contacts/utils/geo.ts) and already stores "USA".
--
-- Also catches case and whitespace variants ("usa", "USA ", "America ") — BINARY makes the
-- comparison exact, since MySQL/MariaDB's default collations ignore both case and trailing spaces.
--
-- Safe to re-run: every statement only touches rows that do not already hold exactly 'USA'.
--
-- Run against the target database (live, or .env's DB_NAME for dev), e.g.
--   mysql --skip-ssl -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" < scripts/migrations/rename-america-to-usa.sql

-- Preview first (read-only) — run just this to see what would change.
SELECT 'partnership_events' AS tbl, CONCAT('"', country, '"') AS stored_value, COUNT(*) AS rows_affected
FROM partnership_events
WHERE LOWER(TRIM(country)) IN ('america', 'usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'united states of america')
  AND BINARY country <> BINARY 'USA'
GROUP BY country
UNION ALL
SELECT 'events', CONCAT('"', country, '"'), COUNT(*)
FROM events
WHERE LOWER(TRIM(country)) IN ('america', 'usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'united states of america')
  AND BINARY country <> BINARY 'USA'
GROUP BY country;

UPDATE partnership_events SET country = 'USA'
WHERE LOWER(TRIM(country)) IN ('america', 'usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'united states of america')
  AND BINARY country <> BINARY 'USA';

UPDATE events SET country = 'USA'
WHERE LOWER(TRIM(country)) IN ('america', 'usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'united states of america')
  AND BINARY country <> BINARY 'USA';

-- Verify — both should now return nothing:
SELECT 'partnership_events' AS tbl, country, COUNT(*) FROM partnership_events
WHERE LOWER(TRIM(country)) IN ('america', 'united states', 'united states of america', 'us', 'u.s.', 'u.s.a.')
   OR (LOWER(TRIM(country)) = 'usa' AND BINARY country <> BINARY 'USA')
GROUP BY country
UNION ALL
SELECT 'events', country, COUNT(*) FROM events
WHERE LOWER(TRIM(country)) IN ('america', 'united states', 'united states of america', 'us', 'u.s.', 'u.s.a.')
   OR (LOWER(TRIM(country)) = 'usa' AND BINARY country <> BINARY 'USA')
GROUP BY country;
