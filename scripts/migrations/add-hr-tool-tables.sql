-- HR Tool ("Huey"): standalone admin HR system — employees, onboarding, attendance,
-- leave, expenses, tickets, compliance, payroll, templates, rules, audit log.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-tool-tables.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS hr_teams (
    name VARCHAR(255) PRIMARY KEY,
    manager VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_designations (
    name VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_expense_categories (
    name VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_required_documents (
    name VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    holiday_date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    UNIQUE KEY uniq_holiday (holiday_date, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_employees (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    designation VARCHAR(255),
    team VARCHAR(255),
    manager VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    doj DATE NULL,
    sys_role VARCHAR(50) NOT NULL DEFAULT 'Employee',
    ctc INT NOT NULL DEFAULT 0,
    leave_balance JSON NULL,
    documents JSON NULL,
    signed_docs JSON NULL,
    ctc_split_override JSON NULL,
    probation_extended_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_team (team),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_onboarding (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    personal_email VARCHAR(255),
    designation VARCHAR(255),
    team VARCHAR(255),
    ctc INT NOT NULL DEFAULT 0,
    stage VARCHAR(30) NOT NULL DEFAULT 'awaiting_signature',
    offer_sent_date DATE NULL,
    signed_date DATE NULL,
    upload_deadline DATE NULL,
    employee_id VARCHAR(20) NULL,
    agreement_stage VARCHAR(30) NOT NULL DEFAULT 'not_started',
    docs JSON NULL,
    assets JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    emp VARCHAR(255) NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    in_time VARCHAR(20),
    out_time VARCHAR(20),
    UNIQUE KEY uniq_emp_date (emp, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_attendance_overrides (
    emp VARCHAR(255) NOT NULL,
    override_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL,
    PRIMARY KEY (emp, override_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_punch_log (
    emp VARCHAR(255) PRIMARY KEY,
    punch_date DATE NOT NULL,
    in_time VARCHAR(20) NULL,
    in_minutes INT NULL,
    out_time VARCHAR(20) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_regularizations (
    id VARCHAR(30) PRIMARY KEY,
    emp VARCHAR(255) NOT NULL,
    reg_date DATE NOT NULL,
    reason TEXT,
    stage VARCHAR(20) NOT NULL DEFAULT 'rm',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rm_remarks TEXT,
    hr_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emp (emp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id VARCHAR(30) PRIMARY KEY,
    emp VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    remarks TEXT,
    stage VARCHAR(20) NOT NULL DEFAULT 'rm',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rm_remarks TEXT,
    hr_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emp (emp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_expenses (
    id VARCHAR(30) PRIMARY KEY,
    emp VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    amount INT NOT NULL DEFAULT 0,
    stage VARCHAR(20) NOT NULL DEFAULT 'rm',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    rm_remarks TEXT,
    hr_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emp (emp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_tickets (
    id VARCHAR(30) PRIMARY KEY,
    emp VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emp (emp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_compliance_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task VARCHAR(255) NOT NULL,
    due_date DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'upcoming'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_payroll_runs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    month VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'not_run',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_templates (
    name VARCHAR(100) PRIMARY KEY,
    content LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Singleton settings row (id always 1) — one company's worth of HR policy configuration.
CREATE TABLE IF NOT EXISTS hr_rules (
    id TINYINT PRIMARY KEY DEFAULT 1,
    working_days_pattern VARCHAR(255),
    shift_start_time VARCHAR(10),
    shift_end_time VARCHAR(10),
    shift_grace_minutes INT DEFAULT 0,
    half_day_threshold_hours INT DEFAULT 4,
    regularization_window_days INT DEFAULT 5,
    regularization_override TINYINT(1) DEFAULT 0,
    salary_period_from INT DEFAULT 1,
    salary_period_to VARCHAR(10) DEFAULT 'last',
    ctc_basic_pct INT DEFAULT 50,
    ctc_hra_pct INT DEFAULT 20,
    ctc_allowances_pct INT DEFAULT 30,
    leave_types JSON NULL,
    two_level_approval_leave TINYINT(1) DEFAULT 1,
    two_level_approval_attendance TINYINT(1) DEFAULT 1,
    two_level_approval_expense TINYINT(1) DEFAULT 1,
    late_mark_penalty TINYINT(1) DEFAULT 0,
    geo_fencing TINYINT(1) DEFAULT 0,
    selfie_checkin TINYINT(1) DEFAULT 0,
    pf_esi TINYINT(1) DEFAULT 0,
    optional_holiday_choice TINYINT(1) DEFAULT 1,
    asset_checklist TINYINT(1) DEFAULT 1,
    CONSTRAINT chk_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ts VARCHAR(50),
    who VARCHAR(255),
    change_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed data below is real company setup (org structure, letter templates, policy defaults),
-- not sample/demo records — matches what the tool's own "Delete all sample data" button
-- already treats as real setup and keeps. One HR Head account is seeded so there's a way
-- to log in at all; every demo employee, onboarding record, and transactional record
-- (attendance/leave/expense/ticket) that used to be hardcoded in script.js is NOT seeded.

INSERT IGNORE INTO hr_teams (name, manager) VALUES
    ('Leadership', NULL), ('Content', NULL), ('Partnerships & BD', NULL);

INSERT IGNORE INTO hr_designations (name) VALUES
    ('Founder & CEO'), ('Co-founder & COO'), ('People Ops Head'), ('Content Lead'), ('Senior Content Writer'),
    ('Content Writer'), ('Video Editor'), ('Graphic Designer'), ('Social Media Executive'), ('Partnerships Lead'),
    ('BD Associate'), ('Tech Lead');

INSERT IGNORE INTO hr_expense_categories (name) VALUES
    ('Travel'), ('Meals'), ('Office Supplies'), ('Client Entertainment'), ('Software/Subscription'), ('Other');

INSERT IGNORE INTO hr_required_documents (name) VALUES
    ('PAN Card'), ('Aadhar'), ('Education Certificates'), ('Previous Employment Proof'), ('Bank Proof');

INSERT IGNORE INTO hr_holidays (holiday_date, name) VALUES
    ('2026-08-15', 'Independence Day'), ('2026-10-02', 'Gandhi Jayanti'), ('2026-10-20', 'Diwali'), ('2027-01-26', 'Republic Day');

INSERT IGNORE INTO hr_templates (name, content) VALUES
    ('Offer Letter', 'Dear {{employee_name}},\n\nWe are pleased to offer you the position of {{designation}} in the {{team}} team at DOTFYI Media Ventures Pvt. Ltd. (StartupNews.fyi), with an annual CTC of {{ctc}}.\n\nPlease review and sign below to confirm your acceptance.'),
    ('Employment Agreement', 'This Employment Agreement is entered into between DOTFYI Media Ventures Pvt. Ltd. and {{employee_name}}, appointed as {{designation}} in the {{team}} team, effective {{doj}}.\n\nAnnual CTC: {{ctc}} — Basic {{basic}}, HRA {{hra}}, Allowances {{allowances}}.\n\nStandard SNF terms of employment apply.'),
    ('Relieving Letter', ''), ('Experience Letter', ''), ('Increment Letter', ''), ('Promotion Letter', ''), ('Warning Letter', '');

INSERT IGNORE INTO hr_rules (
    id, working_days_pattern, shift_start_time, shift_end_time, shift_grace_minutes, half_day_threshold_hours,
    regularization_window_days, regularization_override, salary_period_from, salary_period_to, ctc_basic_pct, ctc_hra_pct, ctc_allowances_pct,
    leave_types, two_level_approval_leave, two_level_approval_attendance, two_level_approval_expense, late_mark_penalty, geo_fencing,
    selfie_checkin, pf_esi, optional_holiday_choice, asset_checklist
) VALUES (
    1, 'Mon–Sat, alternate Saturdays off', '10:00', '19:00', 15, 4,
    5, 0, 1, 'last', 50, 20, 30,
    '{"Casual":true,"Sick":true,"Earned":true,"Maternity":true,"Paternity":true,"Comp-off":true}', 1, 1, 1, 0, 0,
    0, 0, 1, 1
);

INSERT IGNORE INTO hr_employees (id, name, email, designation, team, manager, status, doj, sys_role, ctc, leave_balance, documents, signed_docs) VALUES
    ('E-105', 'Divya Menon', 'divya.menon@snf.co', 'People Ops Head', 'Leadership', NULL, 'active', '2020-01-15', 'HR Head', 980000,
     '{"Casual":5,"Sick":7,"Earned":10}', '[]', '[]');
