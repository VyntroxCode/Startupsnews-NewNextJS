-- Partnership Tracker becomes the direct public read source for /events, /startup-events/:slug,
-- the sidebar widget, sitemap and newsletter — previously these all read a shadow copy pushed
-- one-way into the `events` table (see PartnershipEventsService.syncLinkedEvent). `slug` and
-- `site_status` are the two pieces that copy depended on and partnership_events never had itself.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-public-fields.sql
USE zox_db;

ALTER TABLE partnership_events
    ADD COLUMN slug VARCHAR(255) NULL AFTER event_id,
    ADD COLUMN site_status VARCHAR(20) NULL DEFAULT 'draft' AFTER slug,
    ADD UNIQUE INDEX idx_slug (slug),
    ADD INDEX idx_site_status (site_status);
