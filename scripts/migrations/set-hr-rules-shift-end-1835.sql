-- Sets the office shift to 10:00–18:35 (8h35m).
--
-- The application defaults were changed to 18:35, but DEFAULT_RULES only applies when no
-- hr_rules row exists — an existing installation keeps whatever is stored. This is what
-- actually moves a live installation onto the new shift end, which now matters for real:
-- punch-out is refused after it, a forgotten punch-out is auto-closed at it, and payroll
-- credits hours only up to it (see HrToolService.creditedMinutes).
--
-- Production is a separate database — run this there too, not just on dev.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/set-hr-rules-shift-end-1835.sql

USE zox_db;

UPDATE hr_rules
SET shift_start_time = '10:00',
    shift_end_time   = '18:35'
WHERE id = 1;
