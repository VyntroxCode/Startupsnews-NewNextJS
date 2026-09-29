-- Sales Tracker: which employees each lead is assigned to, and which HR departments were picked.
--
-- Both tables cover both lead sources the "All leads" table shows:
--   lead_source = 'lead' → lead_id is sales_leads.id
--   lead_source = 'ens'  → lead_id is ens_travel_enquiries.id
--
-- sales_lead_assignments — one row per (lead, employee). No rows = unassigned.
--   credential_id is hr_employee_credentials.id, the employee's permanent login id. The Sales
--   Tracker shows the name; this id is what's stored, so an assignment survives the employee's name
--   or Employee ID (employee_code) being edited in HR. Soft link, no FK, same as
--   hr_employees.credential_id.
--   via_department is the department (hr_employees.team) this person was added through, or NULL
--   when an admin picked them by hand. Removing that department from the lead removes exactly the
--   people added through it.
--   status is that employee's own progress on the lead; every newly added person starts at
--   'pending' (see modules/lead-assignments/domain/types.ts).
--
-- sales_lead_departments — the departments picked on the lead, so the lead window shows them again.
--   A snapshot: picking a department adds its members at that moment; people who join it later are
--   not added.
--
-- Replaces the free-text sales_leads.assigned_to + sales_team_members list, which were never linked
-- to HR. Both are left in place, unused.
--
-- 2026-09-24: first written with one assignee per lead (PK lead_source, lead_id), applied on dev
-- only while empty, then reshaped here before ever reaching live. On dev, drop the empty old table
-- first (DROP TABLE sales_lead_assignments;) — on live just run this file.
--
-- Additive only, safe to re-run.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sales-lead-assignments.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS sales_lead_assignments (
  lead_source VARCHAR(10) NOT NULL,
  lead_id VARCHAR(40) NOT NULL,
  credential_id INT NOT NULL,
  via_department VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  assigned_by VARCHAR(255) NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lead_source, lead_id, credential_id),
  INDEX idx_credential (credential_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_lead_departments (
  lead_source VARCHAR(10) NOT NULL,
  lead_id VARCHAR(40) NOT NULL,
  department VARCHAR(255) NOT NULL,
  added_by VARCHAR(255) NULL,
  added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lead_source, lead_id, department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
