-- Widen users.role to add two scoped admin-panel roles: event_admin, publisher_admin.
-- Event Admin: full access to Events + Event Regions only.
-- Publisher Admin: full access to Posts + Categories + Authors (content) only.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-panel-roles.sql

USE zox_db;

ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'editor', 'author', 'event_admin', 'publisher_admin') DEFAULT 'author';
