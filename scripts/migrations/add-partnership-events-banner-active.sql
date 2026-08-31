-- Adds an explicit on/off switch for the Partnership Tracker's "Event banner (homepage)".
--
-- Before this, the only ways to pull a live banner off the homepage were to delete the banner
-- image, delete the whole tracker record, or wait for the event's last day to pass — there was
-- no way to simply take it down for a while and put it back later without losing the image and
-- the scheduled start date. banner_active is that switch: the tracker's Add/Edit modal writes
-- it, and PartnershipEventsService.syncHomepageBanner folds it into the `banners` row's
-- is_active, alongside the existing "linked Event is still Draft/Cancelled" rule.
--
-- DEFAULT 1 so every banner that exists today keeps behaving exactly as it does now.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-banner-active.sql

USE zox_db;

ALTER TABLE partnership_events
  ADD COLUMN banner_active TINYINT(1) NOT NULL DEFAULT 1 AFTER banner_id;
