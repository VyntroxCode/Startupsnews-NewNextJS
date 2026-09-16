-- IT Ticket Management (Jira-style helpdesk) — tickets, comments, attachments,
-- a sequence table for Jira-style keys (IT-1, IT-2, ...), and a new `it_support`
-- panel-admin role that triages/manages the queue alongside `admin`.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-it-tickets-tables.sql

USE zox_db;

-- Dedicated auto_increment counter for ticket keys. A standalone table gives a race-free
-- insertId under concurrent ticket creation without needing SELECT ... FOR UPDATE. Rows are
-- never deleted (4 bytes each — negligible even at large ticket volumes).
CREATE TABLE IF NOT EXISTS it_ticket_key_seq (
  seq INT PRIMARY KEY AUTO_INCREMENT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS it_tickets (
  id VARCHAR(40) PRIMARY KEY,                      -- server-generated: 'tkt_' + randomUUID()
  ticket_key VARCHAR(20) NOT NULL UNIQUE,          -- 'IT-1', 'IT-2', ... from it_ticket_key_seq
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'open',      -- open | in_progress | blocked | resolved | closed
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',  -- low | medium | high | urgent
  type VARCHAR(30) NOT NULL DEFAULT 'other',       -- hardware | software | access | network | other
  reporter_id INT NOT NULL,
  reporter_role VARCHAR(20) NOT NULL,              -- reporter may live in `users` OR `panel_admins`
  reporter_name VARCHAR(255) NOT NULL,             -- denormalized so board/list never join two identity tables
  assignee_id INT NULL,
  assignee_role VARCHAR(20) NULL,
  assignee_name VARCHAR(255) NULL,
  due_date DATE NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_priority (priority),
  INDEX idx_assignee (assignee_id),
  INDEX idx_reporter (reporter_id),
  INDEX idx_ticket_key (ticket_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS it_ticket_comments (
  id VARCHAR(40) PRIMARY KEY,                      -- 'cmt_' + randomUUID()
  ticket_id VARCHAR(40) NOT NULL,
  author_id INT NOT NULL,
  author_role VARCHAR(20) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES it_tickets(id) ON DELETE CASCADE,
  INDEX idx_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS it_ticket_attachments (
  id VARCHAR(40) PRIMARY KEY,                      -- 'att_' + randomUUID()
  ticket_id VARCHAR(40) NOT NULL,
  uploaded_by_id INT NOT NULL,
  uploaded_by_role VARCHAR(20) NOT NULL,
  uploaded_by_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  file_size INT NULL,
  mime_type VARCHAR(150) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES it_tickets(id) ON DELETE CASCADE,
  INDEX idx_ticket (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- New standalone-tool role, alongside event_admin/publisher_admin, that manages the IT ticket queue.
ALTER TABLE panel_admins
  MODIFY COLUMN role ENUM('event_admin', 'publisher_admin', 'it_support') NOT NULL;
