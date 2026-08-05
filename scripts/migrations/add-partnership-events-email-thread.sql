-- Partnership Tracker: adds the "Email Thread" (Gmail link) field from the original
-- standalone tracker tool, used to jump straight to the conversation with the organiser.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-email-thread.sql
USE zox_db;

ALTER TABLE partnership_events
    ADD COLUMN email_thread VARCHAR(1000) NULL AFTER website;
