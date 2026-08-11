-- Sales Tracker: standalone admin CRM for inbound PR/partnership leads.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-sales-tracker-tables.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS sales_leads (
    id VARCHAR(40) PRIMARY KEY,
    lead_date DATE NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    contact VARCHAR(50),
    email VARCHAR(255),
    source VARCHAR(255),
    type VARCHAR(50),
    other_type VARCHAR(255),
    query_text TEXT,
    assigned_to VARCHAR(255),
    status VARCHAR(50),
    next_follow_up_date DATE NULL,
    last_connect_date DATE NULL,
    last_call_discussion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_assigned_to (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_team_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
