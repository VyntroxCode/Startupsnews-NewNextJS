-- Let an uploaded HTML tool be shared with Event Admin and/or Publisher Admin
-- (admin/editor can always see everything; this only widens access, never restricts).
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-admin-tools-visibility.sql

USE zox_db;

ALTER TABLE admin_tools
  ADD COLUMN IF NOT EXISTS visible_to_event_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS visible_to_publisher_admin BOOLEAN DEFAULT FALSE;
