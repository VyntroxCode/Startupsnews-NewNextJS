-- HR "Assigning IDs": Employee ID + password credentials issued by the HR Founder.
-- When linked to a panel_admins row (linked_panel_admin_id), that account signs in
-- via Employee ID + this password instead of its original email/password.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-employee-credentials-table.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS hr_employee_credentials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation ENUM('HR Head', 'Reporting Manager', 'Employee') NOT NULL,
  email VARCHAR(255) NULL,
  avatar_url VARCHAR(1000) NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_display VARCHAR(512) NULL,
  password_iv VARCHAR(32) NULL,
  password_tag VARCHAR(40) NULL,
  panel_role ENUM('event_admin', 'publisher_admin') NULL,
  linked_panel_admin_id INT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NULL,
  updated_by VARCHAR(255) NULL,
  INDEX idx_employee_code (employee_code),
  INDEX idx_linked_panel_admin (linked_panel_admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
