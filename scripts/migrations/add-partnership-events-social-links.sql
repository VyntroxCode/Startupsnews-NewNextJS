-- Partnership Tracker: the organiser's own social profile links, asked for (all optional) on
-- /list-your-event step 4 (Images). Written once when the submission creates the row; the admin
-- tracker shows them read-only and never writes these columns on update.
-- Additive and nullable — existing rows simply have no links.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-social-links.sql
USE zox_db;

ALTER TABLE partnership_events
    ADD COLUMN social_instagram VARCHAR(500) NULL AFTER social_creatives,
    ADD COLUMN social_linkedin VARCHAR(500) NULL AFTER social_instagram,
    ADD COLUMN social_x VARCHAR(500) NULL AFTER social_linkedin,
    ADD COLUMN social_facebook VARCHAR(500) NULL AFTER social_x;
