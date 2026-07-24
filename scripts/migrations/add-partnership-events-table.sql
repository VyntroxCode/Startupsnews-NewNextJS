-- Partnership Tracker: DB-backed replacement for the standalone browser tool.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-partnership-events-table.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS partnership_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_name VARCHAR(500) NOT NULL,
    city VARCHAR(255),
    country VARCHAR(255),
    organiser VARCHAR(255),
    poc VARCHAR(255),
    contact VARCHAR(100),
    email VARCHAR(255),
    website VARCHAR(500),
    initiated_date DATE,
    event_start_date DATE,
    event_end_date DATE,
    partnership_status VARCHAR(100),
    partnership_type VARCHAR(50),
    last_updated_date DATE,
    comment TEXT,
    listing VARCHAR(50),
    listing_link VARCHAR(500),
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,
    INDEX idx_status (partnership_status),
    INDEX idx_start_date (event_start_date),
    FULLTEXT idx_search (event_name, organiser, poc, comment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
