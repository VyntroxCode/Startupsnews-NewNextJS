-- Employee requests for permission to upload documents after their upload window has closed.
--
-- Until now the 5-day window (hr_employees.documents_deadline) was purely decorative: nothing
-- anywhere blocked an upload once it passed. Uploads are now refused past the deadline, and this
-- table is how an employee asks for it to be reopened.
--
-- Approving a request does NOT need a column of its own on hr_employees — it simply pushes
-- documents_deadline forward, so the existing "window doj -> deadline" display, the daysLeft
-- calculation and the new enforcement check all keep working unchanged.
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-document-upload-requests.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS hr_document_upload_requests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  -- Employee NAME, matching hr_attendance / hr_punch_log / hr_regularizations, which all key
  -- employees this way. Deliberately consistent with them rather than with hr_employees.id.
  emp           VARCHAR(255) NOT NULL,
  reason        TEXT NOT NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  requested_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by    VARCHAR(255) NULL,
  decided_at    DATETIME NULL,
  remarks       TEXT NULL,
  -- The deadline the approval granted, so the audit trail shows what was actually given.
  granted_until DATE NULL,
  INDEX idx_emp_status (emp, status),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
