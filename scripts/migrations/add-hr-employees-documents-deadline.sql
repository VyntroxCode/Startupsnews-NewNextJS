-- Employees get a 5-day window (from doj) to submit their required-documents checklist.
-- Stored as a real column (not inside the documents JSON array) since it's one deadline
-- per employee, not per document — needed by both the employee-facing "days left" countdown
-- and the admin-facing Directory document-review cards.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-employees-documents-deadline.sql

USE zox_db;

ALTER TABLE hr_employees
  ADD COLUMN documents_deadline DATE NULL AFTER documents;
