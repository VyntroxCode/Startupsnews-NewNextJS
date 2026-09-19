-- Expand North Star travel enquiries: every submission of the "Plan your visit" form at the foot of
-- /expand-north-star. Until this table existed the form only wrote a row into sales_leads, so the
-- admin Sales Tracker had no record of the enquiry itself and nowhere to edit it.
--
-- The Sales Tracker reads this table for its own "Expand North Star enquiries" card (KPI tiles →
-- table → full-detail view with editing). Each enquiry is ALSO mirrored into sales_leads (see
-- modules/ens-travel-enquiries/service/to-sales-lead.ts) so the team can work it like any other lead
-- — status, assignee, follow-ups — under "Filter: page leads".
--
-- created_at is when the visitor submitted. updated_at stays NULL until an admin edits the enquiry
-- in the Sales Tracker, then holds the time of the last edit (set explicitly by the repository, not
-- ON UPDATE, so it can only ever mean "an admin changed this"); updated_by is that admin's name.
--
-- participation is one of the values in modules/ens-travel-enquiries/domain/participation.ts
-- (delegate-1, delegate-2, booth-1, booth-2, others); requirement is only set for "others".
-- ids are "ens_" + a UUID = 40 chars, the width of sales_leads.id, which the mirrored lead reuses.
--
-- Additive only (a new table), safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-ens-travel-enquiries-table.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS ens_travel_enquiries (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    contact VARCHAR(50) NOT NULL,
    city VARCHAR(120) NOT NULL,
    country VARCHAR(120) NOT NULL,
    participation VARCHAR(20) NOT NULL,
    requirement TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    updated_by VARCHAR(255) NULL,
    INDEX idx_created_at (created_at),
    INDEX idx_participation (participation),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
