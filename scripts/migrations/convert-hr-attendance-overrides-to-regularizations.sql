-- Regularization rules (Interaction Log #1089): HR can no longer edit a day's attendance directly
-- (calendar "HR correction" and "Bulk mark attendance" were removed). Every correction is now an
-- employee regularization request that HR approves or rejects.
--
-- This migration:
--   1. adds hr_regularizations.source ('employee' = a real request, 'hr-edit' = converted from an
--      old direct HR edit — kept for history, never counted in the per-cycle day limit);
--   2. converts every existing Present / Half-day HR edit into approved punch-in + punch-out
--      regularizations and writes the matching times into hr_attendance, so pay is unchanged:
--        Present  → 10:00 am – 06:30 pm (8.5 h, a full day)
--        Half-day → 10:00 am – 02:30 pm (4.5 h, a half day)
--      The employee's original punch is kept in the request's reason for audit;
--   3. deletes all HR edits. Absent edits are simply dropped: on the live data (30 Sep 2026) the
--      only two are Bhawna 14 Sep (raw punch is already Absent — no change) and Yash 25 Sep
--      (approved Casual leave, which now decides the day).
--
-- Payroll no longer reads hr_attendance_overrides, so run this BEFORE the new code goes live.
-- Safe to re-run: every step is idempotent.

ALTER TABLE hr_regularizations
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'employee' AFTER hr_remarks;

START TRANSACTION;

INSERT INTO hr_regularizations
  (id, employee_id, emp, reg_date, punch_type, reason, requested_time, stage, status, rm_remarks, hr_remarks, source)
SELECT
  CONCAT('R-HRE-', o.employee_id, '-', DATE_FORMAT(o.override_date, '%Y%m%d'), '-in'),
  o.employee_id, o.emp, o.override_date, 'in',
  CONCAT('Converted from HR edit (', o.status, '). Original punch: ', COALESCE(a.in_time, '—'), ' – ', COALESCE(a.out_time, '—')),
  '10:00', 'done', 'approved', NULL,
  'Direct HR edit converted to a regularization when HR edits were removed.', 'hr-edit'
FROM hr_attendance_overrides o
LEFT JOIN hr_attendance a ON a.employee_id = o.employee_id AND a.attendance_date = o.override_date
WHERE o.status IN ('present', 'half-day') AND o.employee_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM hr_regularizations r
    WHERE r.employee_id = o.employee_id AND r.reg_date = o.override_date AND r.punch_type = 'in'
  );

INSERT INTO hr_regularizations
  (id, employee_id, emp, reg_date, punch_type, reason, requested_time, stage, status, rm_remarks, hr_remarks, source)
SELECT
  CONCAT('R-HRE-', o.employee_id, '-', DATE_FORMAT(o.override_date, '%Y%m%d'), '-out'),
  o.employee_id, o.emp, o.override_date, 'out',
  CONCAT('Converted from HR edit (', o.status, '). Original punch: ', COALESCE(a.in_time, '—'), ' – ', COALESCE(a.out_time, '—')),
  IF(o.status = 'half-day', '14:30', '18:30'), 'done', 'approved', NULL,
  'Direct HR edit converted to a regularization when HR edits were removed.', 'hr-edit'
FROM hr_attendance_overrides o
LEFT JOIN hr_attendance a ON a.employee_id = o.employee_id AND a.attendance_date = o.override_date
WHERE o.status IN ('present', 'half-day') AND o.employee_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM hr_regularizations r
    WHERE r.employee_id = o.employee_id AND r.reg_date = o.override_date AND r.punch_type = 'out'
  );

-- The day's times, exactly as an approved regularization writes them (GPS columns untouched).
INSERT INTO hr_attendance (employee_id, emp, attendance_date, status, in_time, in_minutes, out_time, out_minutes)
SELECT
  o.employee_id, o.emp, o.override_date, 'Present',
  '10:00 am', 600,
  IF(o.status = 'half-day', '02:30 pm', '06:30 pm'), IF(o.status = 'half-day', 870, 1110)
FROM hr_attendance_overrides o
WHERE o.status IN ('present', 'half-day') AND o.employee_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  status = VALUES(status), in_time = VALUES(in_time), in_minutes = VALUES(in_minutes),
  out_time = VALUES(out_time), out_minutes = VALUES(out_minutes);

DELETE FROM hr_attendance_overrides;

COMMIT;
