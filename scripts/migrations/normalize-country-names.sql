-- Normalize stored country names to the canonical spellings the Add/Edit Event form now offers.
--
-- Background: the Region/Country dropdown grew from a curated ~15-country list to the full
-- 195-country list (src/modules/partnership-events/domain/country-city-data.ts). Three names
-- were DELIBERATELY LEFT IN THEIR SHORT FORM there — USA, UK, UAE — rather than switched to
-- "United States"/"United Kingdom"/"United Arab Emirates", precisely so this migration does not
-- have to rewrite the 18 existing rows that use them. The long names are searchable aliases in
-- the dropdown, so nothing is harder to find. Nothing here touches those three.
--
-- What is left to clean up is the genuinely inconsistent remainder: values that differ from a
-- canonical name only by whitespace, and one-off variant spellings typed in via "Others…".
--
-- Why it matters beyond tidiness: /events groups its sections by this exact string
-- (groupByCountry in src/app/events/page.tsx), so "Türkiye " and "Türkiye" render as two
-- separate top-level country sections holding the same country's events.
--
-- The admin form already snaps such a value to its canonical spelling when a record is reopened
-- (canonicalCountryName), so this would eventually happen record by record on edit. This
-- migration does it in one pass instead, including for records nobody plans to reopen.
--
-- Applies to both tables that hold the value: partnership_events.country (the tracker's own
-- field) and events.country (the public copy written by syncLinkedEvent).
--
-- Run against the same database as .env.local's DB_NAME, e.g.
--   mysql --skip-ssl -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" < scripts/migrations/normalize-country-names.sql

-- Preview first (safe, read-only) — comment out the UPDATEs and run just this to see what moves.
-- At the time of writing this reports: 'Türkiye ' 2, 'Hong Kong ' 2, 'Netherlands ' 2, 'Africa ' 4,
-- 'Kenya ' 1, 'North Africa ' 1, 'Malasiya ' 1, 'United States of America' 1, 'Korea' 1.
SELECT country, COUNT(*) AS rows_affected
FROM partnership_events
WHERE country IS NOT NULL
  AND TRIM(country) <> ''
  AND (country <> TRIM(country) OR TRIM(country) IN
      ('United States', 'United States of America', 'US', 'United Kingdom', 'Great Britain',
       'United Arab Emirates', 'U.A.E.', 'Turkey', 'Czech Republic', 'Korea', 'Republic of Korea'))
GROUP BY country;

-- 1. Trailing/leading whitespace ("Türkiye ", "Africa ", "Hong Kong ") — these already read as
--    their own distinct country on /events purely because of the space.
UPDATE partnership_events SET country = TRIM(country)
WHERE country IS NOT NULL AND country <> TRIM(country);

UPDATE events SET country = TRIM(country)
WHERE country IS NOT NULL AND country <> TRIM(country);

-- 2. Variant spellings -> the canonical dropdown name. Mirrors LEGACY_COUNTRY_ALIASES in
--    country-city-data.ts; keep the two in step if either gains an entry. Note the direction of
--    the first three: they fold the LONG names into the short ones this data already uses, not
--    the other way round.
UPDATE partnership_events SET country = CASE country
    WHEN 'United States' THEN 'USA'
    WHEN 'United States of America' THEN 'USA'
    WHEN 'US' THEN 'USA'
    WHEN 'United Kingdom' THEN 'UK'
    WHEN 'Great Britain' THEN 'UK'
    WHEN 'United Arab Emirates' THEN 'UAE'
    WHEN 'U.A.E.' THEN 'UAE'
    WHEN 'Turkey' THEN 'Türkiye'
    WHEN 'Czech Republic' THEN 'Czechia'
    WHEN 'Korea' THEN 'South Korea'
    WHEN 'Republic of Korea' THEN 'South Korea'
    ELSE country
  END
WHERE country IN ('United States', 'United States of America', 'US', 'United Kingdom',
                  'Great Britain', 'United Arab Emirates', 'U.A.E.', 'Turkey', 'Czech Republic',
                  'Korea', 'Republic of Korea');

UPDATE events SET country = CASE country
    WHEN 'United States' THEN 'USA'
    WHEN 'United States of America' THEN 'USA'
    WHEN 'US' THEN 'USA'
    WHEN 'United Kingdom' THEN 'UK'
    WHEN 'Great Britain' THEN 'UK'
    WHEN 'United Arab Emirates' THEN 'UAE'
    WHEN 'U.A.E.' THEN 'UAE'
    WHEN 'Turkey' THEN 'Türkiye'
    WHEN 'Czech Republic' THEN 'Czechia'
    WHEN 'Korea' THEN 'South Korea'
    WHEN 'Republic of Korea' THEN 'South Korea'
    ELSE country
  END
WHERE country IN ('United States', 'United States of America', 'US', 'United Kingdom',
                  'Great Britain', 'United Arab Emirates', 'U.A.E.', 'Turkey', 'Czech Republic',
                  'Korea', 'Republic of Korea');

-- Deliberately untouched: values that aren't countries at all and are used as real region
-- labels by the site ("Cohort", "Online", "Virtual", "International Events", "Africa",
-- "North Africa"), plus misspellings that need a human decision ("Malasiya" -> Malaysia?,
-- "Mumbai" as a country). Fix those from the admin form so the linked public event updates too.

-- Verify:
SELECT country, COUNT(*) c FROM partnership_events GROUP BY country ORDER BY c DESC;
