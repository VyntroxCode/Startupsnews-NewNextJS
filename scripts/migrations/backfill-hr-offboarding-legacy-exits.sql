-- HR Offboarding: give every employee who was marked "exited" BEFORE offboarding existed (the old
-- Directory "Mark as exited" button, which only changed hr_employees.status) a proper exit case.
--
-- Why: portal access is decided only by hr_offboarding (HrOffboardingService.accessForCredential).
-- Without a case, such an employee's login still had FULL access. With this case they get the same
-- read-only "My Exit" access as any other leaver, and HR can still run the checklist, Full & Final
-- and letters for them from Offboarding → Exited.
--
-- Last working day: their last attendance date (the Directory rewrites hr_employees on every save, so
-- its timestamps say nothing about when they left); today if they never punched. Payroll treats days
-- after it as not employed. Notice days 0 = no notice-shortfall line in their F&F.
--
-- Safe to re-run: only employees with status 'exited' and NO case at all are touched.
-- Run after add-hr-offboarding.sql and add-hr-offboarding-phase2.sql:
--   mysql -u zox_user -p zox_db < scripts/migrations/backfill-hr-offboarding-legacy-exits.sql
USE zox_db;

INSERT INTO hr_offboarding (
    employee_id, credential_id, emp, exit_type, initiated_by, status, resignation_date, reason_category, reason_text,
    requested_lwd, notice_days, notice_waived_days, approved_lwd, termination_mode, access_mode,
    decided_by, decided_at, decision_note
)
SELECT
    e.id, e.credential_id, e.name, 'resignation', 'admin', 'exited',
    COALESCE(la.last_day, CURDATE()), 'Recorded before offboarding existed', NULL,
    NULL, 0, 0, COALESCE(la.last_day, CURDATE()), NULL, 'alumni',
    'System (backfill)', NOW(),
    'Marked exited in the Directory before the offboarding flow existed. Last working day taken from their last attendance record.'
FROM hr_employees e
LEFT JOIN (SELECT employee_id, MAX(attendance_date) AS last_day FROM hr_attendance GROUP BY employee_id) la ON la.employee_id = e.id
WHERE e.status = 'exited'
  AND NOT EXISTS (SELECT 1 FROM hr_offboarding o WHERE o.employee_id = e.id);

-- What was created (for the person running it).
SELECT id, employee_id, emp, approved_lwd, access_mode FROM hr_offboarding WHERE decided_by = 'System (backfill)';
