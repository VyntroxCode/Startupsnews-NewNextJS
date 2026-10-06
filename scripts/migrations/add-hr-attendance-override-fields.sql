-- HR attendance override, restored (2026-10-03).
-- hr_attendance_overrides was emptied on 2026-09-30 when direct HR edits were removed
-- (convert-hr-attendance-overrides-to-regularizations.sql). It now comes back with a mandatory
-- reason and who/when, and the day ledger (payroll + both calendars) reads it.
-- Safe to re-run.

ALTER TABLE hr_attendance_overrides ADD COLUMN IF NOT EXISTS employee_id VARCHAR(20) NULL AFTER emp;
ALTER TABLE hr_attendance_overrides ADD UNIQUE INDEX IF NOT EXISTS uniq_employee_date (employee_id, override_date);
ALTER TABLE hr_attendance_overrides ADD COLUMN IF NOT EXISTS reason TEXT NULL AFTER status;
ALTER TABLE hr_attendance_overrides ADD COLUMN IF NOT EXISTS set_by VARCHAR(255) NULL AFTER reason;
ALTER TABLE hr_attendance_overrides ADD COLUMN IF NOT EXISTS set_at DATETIME NULL AFTER set_by;
