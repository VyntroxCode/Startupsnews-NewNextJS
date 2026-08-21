-- Restructures the Payroll table's columns to Total Days / Present Days / Absent Days / Week Off
-- / Leave Days / LOP Days / Gross / TDS / Net Pay.
-- lop_days changes meaning from a whole-day "no punch, no leave" count to the actual pay-impact
-- figure (can be fractional, e.g. 2.5, since Half Day and converted Short Leave days cost half a
-- day each) — widened from INT to DECIMAL. The old whole-day count moves to the new absent_days
-- column. total_days and week_off_days are new. tds is a placeholder (0) until HR provides the
-- calculation rule.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-payroll-entries-column-restructure.sql

USE zox_db;

ALTER TABLE hr_payroll_entries
  ADD COLUMN total_days INT NOT NULL DEFAULT 0 AFTER working_days,
  ADD COLUMN absent_days INT NOT NULL DEFAULT 0 AFTER present_days,
  ADD COLUMN week_off_days INT NOT NULL DEFAULT 0 AFTER absent_days,
  ADD COLUMN tds INT NOT NULL DEFAULT 0 AFTER monthly_gross,
  MODIFY COLUMN lop_days DECIMAL(6,1) NOT NULL DEFAULT 0;
