-- Move Event Admin / Publisher Admin into their own table, separate from `users`
-- (which holds real login accounts: admin/editor/author).
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-panel-admins-table.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS panel_admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('event_admin', 'publisher_admin') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'editor', 'author') DEFAULT 'author';
