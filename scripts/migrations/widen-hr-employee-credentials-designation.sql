-- Assigning IDs' Designation should offer the same admin-managed Designations list used
-- everywhere else (Rules & Org Structure), not a fixed 3-value set — so this column can no
-- longer be a strict enum.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/widen-hr-employee-credentials-designation.sql

USE zox_db;

ALTER TABLE hr_employee_credentials
  MODIFY COLUMN designation VARCHAR(255) NOT NULL;
