-- Adds the policy fields needed for the new employee-facing "Rules & Policy" page and the
-- monthly-capped regularization request flow: how many regularization requests an employee
-- may submit per month (separate from the existing days-based request window), and the
-- short-leave policy (max hours to count as a short leave, and how many per month).
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-rules-regularization-shortleave.sql

USE zox_db;

ALTER TABLE hr_rules
  ADD COLUMN regularization_monthly_quota INT DEFAULT 5 AFTER regularization_override,
  ADD COLUMN short_leave_max_hours DECIMAL(3,1) DEFAULT 2.0 AFTER regularization_monthly_quota,
  ADD COLUMN short_leave_monthly_quota INT DEFAULT 2 AFTER short_leave_max_hours;
