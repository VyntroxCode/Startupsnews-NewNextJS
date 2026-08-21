-- half_day_threshold_hours was INT (whole hours only), but the Half Day punch-in cutoff now
-- needs to land on a half-hour boundary (e.g. shift start + 5.5h = 3:30 PM). Widen to match
-- short_leave_max_hours' existing DECIMAL(3,1) column.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/widen-hr-rules-half-day-threshold-hours.sql

USE zox_db;

ALTER TABLE hr_rules
  MODIFY COLUMN half_day_threshold_hours DECIMAL(3,1) DEFAULT 4.0;
