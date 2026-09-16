-- Sales Tracker: give sales_leads its own Country/City columns so the Add/Edit lead form can offer
-- the same Country/City dropdown fields (and the same phone field) the public forms use, instead of
-- burying location in the free-text Query description.
--
-- Additive only (two new nullable columns), safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sales-leads-country-city.sql
USE zox_db;

ALTER TABLE sales_leads
  ADD COLUMN IF NOT EXISTS country VARCHAR(120) NULL AFTER email,
  ADD COLUMN IF NOT EXISTS city VARCHAR(120) NULL AFTER country;
