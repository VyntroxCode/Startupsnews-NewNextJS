-- Assigning IDs is merging into Employee Directory: hiring an employee now creates their
-- hr_employees record and their hr_employee_credentials (Employee ID + password) record
-- together, in one flow. This adds a real join key between them, instead of relying purely
-- on name-matching (still used as a fallback for older/legacy rows, e.g. CSV-imported
-- employees who never had a credential_id set).
-- Soft reference on purpose (no FK constraint) — hr_employees is saved via a whole-table
-- delete-and-reinsert (replaceAllRows), which a FK constraint would fight.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-employees-credential-id.sql

USE zox_db;

ALTER TABLE hr_employees
  ADD COLUMN credential_id INT NULL AFTER id,
  ADD INDEX idx_credential_id (credential_id);
