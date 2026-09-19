-- Expand North Star enquiries are kept entirely apart from the other pages' leads: they live only
-- in ens_travel_enquiries and are worked from the Sales Tracker's own "Expand North Star enquiries"
-- card (with its own Lead status). Until 2026-09-17 the public form also mirrored each one into
-- sales_leads as an "Expand North Star Page Leads" row, so they showed up in All leads too.
--
-- This removes those mirrored rows. The enquiries themselves are untouched — every one is still in
-- ens_travel_enquiries (the mirrored row reused the enquiry's own "ens_…" id, which is what the
-- second condition matches).
--
-- Data-only, safe to re-run (deletes nothing the second time).
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/remove-ens-mirrored-sales-leads.sql
USE zox_db;

DELETE FROM sales_leads
 WHERE type = 'Expand North Star Page Leads'
    OR id LIKE 'ens\_%';
