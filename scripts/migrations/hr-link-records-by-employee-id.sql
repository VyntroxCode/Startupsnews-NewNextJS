-- ============================================================================
-- HR Management: link every employee-owned record to hr_employees.id instead of the name.
--
-- Until now nine tables stored the employee NAME in `emp`, and several unique keys were built on
-- it, so two employees sharing a name would share (and overwrite) attendance, punches and payroll.
-- After this migration every record carries `employee_id` (= hr_employees.id, e.g. "E-109") and
-- the application reads/writes/matches by it; `emp` stays as a display snapshot of the name.
-- Reporting managers get the same treatment via `manager_id`.
--
-- Run in TWO parts:
--
--   PART 1 — additive. Safe to apply while the OLD build is still running (it never reads or
--            writes the new columns, and the new unique keys ignore its NULL employee_id rows).
--            Apply before (or long before) the build that ships the new code.
--
--   PART 2 — removes the name-based unique keys, which is what finally allows two employees with
--            the same name. Apply right AFTER the new build is live (build -> pm2 restart ->
--            Part 2). The old build depends on those keys for its upserts, so never run Part 2
--            while it is still serving.
--
-- The backfill only matches names that are unique in hr_employees, so it can never attach a row
-- to the wrong person. It is safe to re-run; the app also runs it at runtime as a safety net
-- (HrToolRepository.backfillMissingEmployeeIds).
--
-- Run:  mysql -u zox_user -p zox_db < scripts/migrations/hr-link-records-by-employee-id.sql
--       (Part 2 is commented out below — uncomment and run it on its own after the build.)
-- ============================================================================

USE zox_db;

-- ---------------------------------------------------------------- PART 1 ----

ALTER TABLE hr_attendance               ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_attendance_overrides     ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_punch_log                ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_regularizations          ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_leave_requests           ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_expenses                 ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_tickets                  ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_payroll_entries          ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_document_upload_requests ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_employees                ADD COLUMN IF NOT EXISTS manager_id  VARCHAR(20) NULL AFTER manager;
ALTER TABLE hr_teams                    ADD COLUMN IF NOT EXISTS manager_id  VARCHAR(20) NULL AFTER manager;

-- Lookup indexes for the new key (unique where the old name key was unique).
ALTER TABLE hr_attendance               ADD UNIQUE INDEX IF NOT EXISTS uniq_employee_date (employee_id, attendance_date);
ALTER TABLE hr_attendance_overrides     ADD UNIQUE INDEX IF NOT EXISTS uniq_employee_date (employee_id, override_date);
ALTER TABLE hr_punch_log                ADD UNIQUE INDEX IF NOT EXISTS uniq_employee (employee_id);
ALTER TABLE hr_payroll_entries          ADD UNIQUE INDEX IF NOT EXISTS uniq_month_employee (month, employee_id);
ALTER TABLE hr_regularizations          ADD INDEX IF NOT EXISTS idx_employee_id (employee_id);
ALTER TABLE hr_leave_requests           ADD INDEX IF NOT EXISTS idx_employee_id (employee_id);
ALTER TABLE hr_expenses                 ADD INDEX IF NOT EXISTS idx_employee_id (employee_id);
ALTER TABLE hr_tickets                  ADD INDEX IF NOT EXISTS idx_employee_id (employee_id);
ALTER TABLE hr_document_upload_requests ADD INDEX IF NOT EXISTS idx_employee_status (employee_id, status);
ALTER TABLE hr_employees                ADD INDEX IF NOT EXISTS idx_manager_id (manager_id);

-- Backfill from names that belong to exactly one employee.
CREATE OR REPLACE VIEW hr_unique_employee_names AS
  SELECT name, MIN(id) AS id FROM hr_employees GROUP BY name HAVING COUNT(*) = 1;

UPDATE hr_attendance t               JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_attendance_overrides t     JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_punch_log t                JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_regularizations t          JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_leave_requests t           JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_expenses t                 JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_tickets t                  JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_payroll_entries t          JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_document_upload_requests t JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
UPDATE hr_employees t                JOIN hr_unique_employee_names e ON e.name = t.manager SET t.manager_id = e.id WHERE t.manager_id IS NULL AND t.manager IS NOT NULL;
UPDATE hr_teams t                    JOIN hr_unique_employee_names e ON e.name = t.manager SET t.manager_id = e.id WHERE t.manager_id IS NULL AND t.manager IS NOT NULL;

DROP VIEW hr_unique_employee_names;

-- ---------------------------------------------------------------- PART 2 ----
-- Run ONLY after the build that reads/writes employee_id is live. Re-runs the backfill first for
-- anything the old build wrote in between, then drops the name-based unique keys.
--
-- CREATE OR REPLACE VIEW hr_unique_employee_names AS
--   SELECT name, MIN(id) AS id FROM hr_employees GROUP BY name HAVING COUNT(*) = 1;
-- UPDATE hr_attendance t           JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- UPDATE hr_attendance_overrides t JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- UPDATE hr_punch_log t            JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- UPDATE hr_regularizations t      JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- UPDATE hr_leave_requests t       JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- UPDATE hr_expenses t             JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- UPDATE hr_tickets t              JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- UPDATE hr_payroll_entries t      JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- UPDATE hr_document_upload_requests t JOIN hr_unique_employee_names e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL;
-- DROP VIEW hr_unique_employee_names;
--
-- ALTER TABLE hr_attendance           DROP INDEX uniq_emp_date, ADD INDEX idx_emp (emp);
-- ALTER TABLE hr_attendance_overrides DROP PRIMARY KEY, ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST;
-- ALTER TABLE hr_punch_log            DROP PRIMARY KEY, ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST, ADD INDEX idx_emp (emp);
-- ALTER TABLE hr_payroll_entries      DROP INDEX uniq_month_emp;
