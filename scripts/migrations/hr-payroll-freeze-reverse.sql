-- Payroll Freeze / Reverse (Interaction Log #1130, arch #263):
--   * Run Payroll only saves a draft (no auto-update, no auto-lock, no Founder reopen).
--   * Freeze makes a month final: frozen_at/by set, each entry's payslip snapshot stored in
--     payslip_json, and the payslip appears in the employee's My Payslips.
--   * Reverse (latest frozen month only, reason required) clears the freeze and the snapshots.
--   * Months already run before this change (Aug 2026 locked, Sep 2026 run) count as frozen; their
--     snapshots are filled on first read.
-- locked_at / reopened_until / reopen_reason stay in the table but are no longer read.
-- Safe to re-run.

ALTER TABLE hr_payroll_runs
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMP NULL DEFAULT NULL AFTER reopen_reason,
  ADD COLUMN IF NOT EXISTS frozen_by VARCHAR(255) NULL AFTER frozen_at,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP NULL DEFAULT NULL AFTER frozen_by,
  ADD COLUMN IF NOT EXISTS reversed_by VARCHAR(255) NULL AFTER reversed_at,
  ADD COLUMN IF NOT EXISTS reverse_reason TEXT NULL AFTER reversed_by;

ALTER TABLE hr_payroll_entries
  ADD COLUMN IF NOT EXISTS payslip_json LONGTEXT NULL;

-- Existing runs become frozen (only the first time — a later reverse is never undone by re-running this).
UPDATE hr_payroll_runs
  SET frozen_at = COALESCE(locked_at, NOW()), frozen_by = COALESCE(run_by, 'migration')
  WHERE status = 'run' AND frozen_at IS NULL AND reversed_at IS NULL;
