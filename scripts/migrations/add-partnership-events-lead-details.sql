-- Partnership Tracker: richer "submit your event" lead details captured by the
-- team when logging/qualifying an organiser's event (venue, ticketing, speakers,
-- creative assets, social copy) — feeds the admin Add/Edit Event modal.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-lead-details.sql
USE zox_db;

ALTER TABLE partnership_events
    ADD COLUMN event_start_time VARCHAR(20) NULL AFTER event_start_date,
    ADD COLUMN event_end_time VARCHAR(20) NULL AFTER event_end_date,
    ADD COLUMN venue_address TEXT NULL AFTER event_end_time,
    ADD COLUMN google_location_link VARCHAR(500) NULL AFTER venue_address,
    ADD COLUMN description TEXT NULL AFTER google_location_link,
    ADD COLUMN event_type VARCHAR(20) NULL AFTER description,
    ADD COLUMN ticket_currency VARCHAR(10) NULL AFTER event_type,
    ADD COLUMN ticket_price VARCHAR(50) NULL AFTER ticket_currency,
    ADD COLUMN speakers JSON NULL AFTER ticket_price,
    ADD COLUMN poster_url VARCHAR(500) NULL AFTER speakers,
    ADD COLUMN banner_url VARCHAR(500) NULL AFTER poster_url,
    ADD COLUMN social_media_posts TEXT NULL AFTER banner_url,
    ADD COLUMN social_creatives JSON NULL AFTER social_media_posts;
