-- Attendance now classifies each punch-in into Grace / Short Leave / Half Day / Absent
-- buckets (not just present-vs-LOP). Payroll needs to record the monthly Short Leave and Half
-- Day counts per employee — every 3rd Short Leave converts into one Half Day at pay-calc time,
-- and each Half Day (explicit or converted) costs half a day's pay. presentDays/leaveDays/lopDays
-- are unaffected by this migration.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-payroll-entries-half-day-columns.sql

USE zox_db;

ALTER TABLE hr_payroll_entries
  ADD COLUMN short_leave_days INT NOT NULL DEFAULT 0 AFTER leave_days,
  ADD COLUMN half_day_days INT NOT NULL DEFAULT 0 AFTER short_leave_days;
