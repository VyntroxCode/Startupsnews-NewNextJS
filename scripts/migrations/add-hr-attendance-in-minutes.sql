-- The employee attendance calendar needs to color-code each day by how late the punch-in
-- was (green/orange/red against shift start + grace period), but hr_attendance only ever
-- stored the human-readable in_time string — the raw clock-minutes value only lived in
-- hr_punch_log, which is keyed by employee only (one row, overwritten every day) and can't
-- answer "what time did they punch in on August 3rd". Adding the same in_minutes value
-- hr_punch_log already captures at punch time, stored per-day here instead.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-attendance-in-minutes.sql

USE zox_db;

ALTER TABLE hr_attendance
  ADD COLUMN in_minutes INT NULL AFTER in_time;
