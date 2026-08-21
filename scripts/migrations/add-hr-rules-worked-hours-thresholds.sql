-- Secondary attendance rule alongside the punch-in-time buckets (grace/short leave/half day/
-- absent by arrival clock time): total hours worked (punch-out minus punch-in) that day. The
-- worse of the two rules decides the day's actual status/pay — see
-- HrToolService.computePayrollForMonth's combinedAttendanceBucket usage.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-rules-worked-hours-thresholds.sql

USE zox_db;

ALTER TABLE hr_rules
  ADD COLUMN half_day_min_worked_hours DECIMAL(4,2) DEFAULT 4.5 AFTER short_leave_monthly_quota,
  ADD COLUMN short_leave_min_worked_hours DECIMAL(4,2) DEFAULT 7.5 AFTER half_day_min_worked_hours,
  ADD COLUMN full_day_min_worked_hours DECIMAL(4,2) DEFAULT 8.25 AFTER short_leave_min_worked_hours;
