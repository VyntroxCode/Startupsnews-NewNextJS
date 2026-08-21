-- Mirrors the existing in_minutes columns (added for punch-in lateness math) with an
-- out_minutes column, needed to compute actual hours worked (out_minutes - in_minutes) for the
-- new hours-worked attendance rule. hr_punch_log feeds "today" live status; hr_attendance feeds
-- the historical calendar and payroll.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-attendance-punch-log-out-minutes.sql

USE zox_db;

ALTER TABLE hr_attendance
  ADD COLUMN out_minutes INT NULL AFTER in_minutes;

ALTER TABLE hr_punch_log
  ADD COLUMN out_minutes INT NULL AFTER in_minutes;
