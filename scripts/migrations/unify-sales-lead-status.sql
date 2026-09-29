-- One shared lead status: Pending · Follow Up · Confirmed · Not Interested (2026-09-29).
--
-- The Sales Tracker (admin) and My Leads (employee) now read and write ONE status per lead:
--   sales_leads.status            stores the label: 'Pending' | 'Follow Up' | 'Confirmed' | 'Not Interested'
--   ens_travel_enquiries.lead_status keeps its codes: NULL (Pending) | 'followed-up' | 'confirmed' | 'cancelled'
-- (see modules/lead-assignments/domain/types.ts ASSIGNMENT_STATUS_OPTIONS).
--
-- Per the product owner, every existing lead starts again at Pending — the old eight Sales Tracker
-- statuses ("Query received" … "Successfully closed") have no one-to-one match.
-- sales_lead_assignments.status (the old per-employee status) is no longer read; it is reset too so
-- nothing stale lingers. Follow-up HISTORY is not reset: each entry keeps the status it was saved
-- with, translated to the new names.
--
-- Run AFTER the build that ships the four statuses (the old build's dropdowns don't list 'Pending').
-- Safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/unify-sales-lead-status.sql
USE zox_db;

UPDATE sales_leads SET status = 'Pending';

UPDATE ens_travel_enquiries SET lead_status = NULL;

UPDATE sales_lead_assignments SET status = 'pending';

UPDATE sales_lead_followups
   SET status = CASE status
                  WHEN 'contacted'  THEN 'follow-up'
                  WHEN 'interested' THEN 'follow-up'
                  WHEN 'closed'     THEN 'confirmed'
                  ELSE status
                END
 WHERE status IN ('contacted', 'interested', 'closed');
