-- Short Leaves that don't add up to a multiple of 3 within a payroll cycle now carry forward
-- to the next cycle instead of resetting to zero (e.g. 5 short leaves this month = 1 Half Day
-- + 2 carried; 1 more next month completes the next Half Day). Stores the leftover so the next
-- cycle's computePayrollForMonth can read it back as its starting balance.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-payroll-entries-short-leave-carry.sql

USE zox_db;

ALTER TABLE hr_payroll_entries
  ADD COLUMN short_leave_carry_out INT NOT NULL DEFAULT 0 AFTER short_leave_days;
