-- Leave rules (Interaction Log #1091):
--   1. hr_leave_requests.half_day — 'first' / 'second' for a half-day leave on a single date
--      (0.5 of the balance), NULL for full-day leave. Status gains 'cancelled' (varchar, no change).
--   2. hr_payroll_entries present/absent/leave/week-off days become DECIMAL(6,1): half days and
--      half-day leave made them fractional, and INT rounded 16.5 present days to 17 on the payslip.
--   3. All Saturdays are working days — the rule text said "alternate Saturdays off", which the
--      system never applied (only Sundays + the Holiday calendar are off).
-- Safe to re-run.

ALTER TABLE hr_leave_requests
  ADD COLUMN IF NOT EXISTS half_day VARCHAR(10) NULL DEFAULT NULL AFTER to_date;

ALTER TABLE hr_payroll_entries
  MODIFY COLUMN present_days DECIMAL(6,1) NOT NULL DEFAULT 0,
  MODIFY COLUMN absent_days DECIMAL(6,1) NOT NULL DEFAULT 0,
  MODIFY COLUMN leave_days DECIMAL(6,1) NOT NULL DEFAULT 0,
  MODIFY COLUMN week_off_days DECIMAL(6,1) NOT NULL DEFAULT 0;

UPDATE hr_rules SET working_days_pattern = 'Mon–Sat working (all Saturdays), Sundays and public holidays off';
