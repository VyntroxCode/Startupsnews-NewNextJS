-- HR Offboarding: one case per exit (resignation or termination), its clearance checklist, and the
-- singleton offboarding settings (notice days, default checklist, encashable leave types).
--
-- Deliberately NOT columns on hr_employees: the Directory saves that table with a whole-table
-- delete-and-reinsert (replaceAllRows) from the browser's in-memory list, which would wipe any
-- column the client doesn't know about. hr_offboarding is the source of truth for exit state and
-- portal access; hr_employees.status is only a display mirror ('exited' once the LWD has passed).
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-offboarding.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS hr_offboarding (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id VARCHAR(20) NOT NULL,
    credential_id INT NULL,
    emp VARCHAR(255) NOT NULL,
    exit_type VARCHAR(20) NOT NULL,              -- resignation | termination
    initiated_by VARCHAR(20) NOT NULL,           -- employee | admin
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | accepted | exited | completed | rejected | withdrawn | cancelled
    resignation_date DATE NOT NULL,
    reason_category VARCHAR(100) NULL,
    reason_text TEXT NULL,
    requested_lwd DATE NULL,
    notice_days INT NOT NULL DEFAULT 0,
    notice_waived_days INT NOT NULL DEFAULT 0,
    approved_lwd DATE NULL,
    termination_mode VARCHAR(20) NULL,           -- immediate | with_notice (terminations only)
    access_mode VARCHAR(20) NOT NULL DEFAULT 'alumni', -- alumni | blocked — applies after the LWD
    personal_email VARCHAR(255) NULL,
    handover_notes TEXT NULL,
    rehire_eligible TINYINT(1) NULL,
    decided_by VARCHAR(255) NULL,
    decided_at DATETIME NULL,
    decision_note TEXT NULL,
    fnf JSON NULL,
    letters JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee (employee_id),
    INDEX idx_credential (credential_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_offboarding_clearance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    offboarding_id INT NOT NULL,
    category VARCHAR(20) NOT NULL,               -- asset | handover | finance | access
    item VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | done | na
    note TEXT NULL,
    deduction_amount INT NOT NULL DEFAULT 0,
    done_by VARCHAR(255) NULL,
    done_at DATETIME NULL,
    INDEX idx_offboarding (offboarding_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Singleton (id always 1), same convention as hr_rules / hr_company_profile.
CREATE TABLE IF NOT EXISTS hr_offboarding_settings (
    id TINYINT PRIMARY KEY DEFAULT 1,
    notice_days_probation INT NOT NULL DEFAULT 15,
    notice_days_confirmed INT NOT NULL DEFAULT 30,
    checklist JSON NULL,
    encashable_leave_types JSON NULL,
    updated_by VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO hr_offboarding_settings (id, notice_days_probation, notice_days_confirmed, checklist, encashable_leave_types) VALUES (
    1, 15, 30,
    '{"asset":["Laptop","Charger","ID card","Access card"],"handover":["Leads reassigned","Handover notes received"],"finance":["Expense claims settled","Advances recovered"],"access":["Company email disabled","Tools & social access removed","Panel access removed"]}',
    '["Earned"]'
);
