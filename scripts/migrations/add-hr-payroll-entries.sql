-- Payroll V1: real Net Pay computed from attendance/leave data instead of the old flat-rate
-- placeholder (ctc/12 minus a hardcoded 7.8%). Adds a real per-employee-per-month payroll
-- record (nothing was ever actually stored before — "Run Payroll" just flipped a status flag)
-- and an audit trail of who ran a given month's payroll and when.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-payroll-entries.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS hr_payroll_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    month VARCHAR(20) NOT NULL,
    emp VARCHAR(255) NOT NULL,
    working_days INT NOT NULL,
    present_days INT NOT NULL,
    lop_days INT NOT NULL,
    monthly_gross INT NOT NULL,
    net_pay INT NOT NULL,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_month_emp (month, emp),
    INDEX idx_month (month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE hr_payroll_runs
  ADD COLUMN run_at TIMESTAMP NULL AFTER status,
  ADD COLUMN run_by VARCHAR(255) NULL AFTER run_at;
