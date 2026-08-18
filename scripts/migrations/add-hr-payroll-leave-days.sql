-- Payroll's "Present Days" previously silently counted approved-leave days as present too,
-- so there was no way to see how many days were actually worked vs. taken as leave. Splits
-- them into two separate, honest columns; LOP-day math is unaffected.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-payroll-leave-days.sql

USE zox_db;

ALTER TABLE hr_payroll_entries
  ADD COLUMN leave_days INT NOT NULL DEFAULT 0 AFTER present_days;
