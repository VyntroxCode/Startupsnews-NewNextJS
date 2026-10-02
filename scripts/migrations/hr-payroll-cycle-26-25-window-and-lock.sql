-- Payroll rules (Interaction Log #1092):
--   * Salary cycle becomes 26th → 25th (was 1st → last day). A cycle is named by the month it ends
--     in, so "2026-10" = 26 Sep → 25 Oct.
--   * Run Payroll works only in the 5 days after a cycle ends (26th–30th), then the cycle locks.
--     Requests for a cycle that changed after its last run make it stale (re-run needed), which
--     needs updated_at on the two request tables and a DB-clock computed_at on the run.
--   * Changeover: August (1–31 Aug) stays as paid and is locked. September's old 1–30 Sep run is
--     removed so September is recalculated as 26 Aug → 25 Sep (26–31 Aug count as paid — already
--     settled in August's run, recorded via period_to below). October = 26 Sep → 25 Oct.
-- Safe to re-run.

ALTER TABLE hr_payroll_runs
  ADD COLUMN IF NOT EXISTS period_from DATE NULL AFTER run_by,
  ADD COLUMN IF NOT EXISTS period_to DATE NULL AFTER period_from,
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP NULL DEFAULT NULL AFTER period_to,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP NULL DEFAULT NULL AFTER computed_at,
  ADD COLUMN IF NOT EXISTS reopened_until DATE NULL AFTER locked_at,
  ADD COLUMN IF NOT EXISTS reopen_reason TEXT NULL AFTER reopened_until;

ALTER TABLE hr_regularizations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
UPDATE hr_regularizations SET updated_at = created_at;

ALTER TABLE hr_leave_requests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
UPDATE hr_leave_requests SET updated_at = created_at;

-- August: paid on the old 1st → last cycle; record that and lock it.
UPDATE hr_payroll_runs
  SET period_from = '2026-08-01', period_to = '2026-08-31', computed_at = COALESCE(computed_at, run_at), locked_at = COALESCE(locked_at, NOW())
  WHERE month = '2026-08';

-- September: drop the old 1–30 Sep run (not yet paid out) so it is recalculated as 26 Aug → 25 Sep.
DELETE FROM hr_payroll_entries WHERE month = '2026-09';
DELETE FROM hr_payroll_runs WHERE month = '2026-09';

UPDATE hr_rules SET salary_period_from = 26, salary_period_to = '25';
