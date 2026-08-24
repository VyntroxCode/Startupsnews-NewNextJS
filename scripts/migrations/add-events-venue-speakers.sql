-- Public `events` table never carried venue address / Google Maps link / speakers — those only
-- ever lived on `partnership_events` and were dropped on sync into the public page. Adds the
-- same columns (same types as partnership_events' own venue_address/google_location_link/speakers)
-- so PartnershipEventsService.syncLinkedEvent can push them through and the public event detail
-- page (/startup-events/[slug]) can render a real Venue section + speaker list.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-events-venue-speakers.sql
USE zox_db;

ALTER TABLE events
    ADD COLUMN venue_address TEXT NULL AFTER external_url,
    ADD COLUMN google_location_link VARCHAR(500) NULL AFTER venue_address,
    ADD COLUMN speakers JSON NULL AFTER google_location_link;
