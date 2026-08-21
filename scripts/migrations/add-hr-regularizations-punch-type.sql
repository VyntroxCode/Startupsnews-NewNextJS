-- Employees can now regularize a punch-in and a punch-out independently for the same date,
-- each with the specific time they're requesting be recorded. A date with both regularized
-- produces two rows (one punch_type='in', one punch_type='out'); one-sided requests produce one.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-regularizations-punch-type.sql

USE zox_db;

ALTER TABLE hr_regularizations
  ADD COLUMN punch_type VARCHAR(10) NOT NULL DEFAULT 'in' AFTER reg_date,
  ADD COLUMN requested_time VARCHAR(20) NULL AFTER reason;
