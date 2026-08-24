-- The Our Partners admin dropdown was simplified from four categories to two
-- (International / National) — remap existing partner_logos rows so nothing gets orphaned by
-- the narrower PARTNER_LOGO_SECTIONS list (the public page and admin API only recognize the
-- new two values afterward).
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/remap-partner-logo-sections-to-international-national.sql
USE zox_db;

UPDATE partner_logos SET section = 'National' WHERE section IN ('Indian Partnerships', 'e-Cell Partnerships');
UPDATE partner_logos SET section = 'International' WHERE section IN ('International Events', 'International Events Organisers');
