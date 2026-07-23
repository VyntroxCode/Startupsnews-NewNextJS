-- Network Manager: standalone admin CRM for founders/investors/sponsors/venues/media contacts.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-contacts-table.sql
USE zox_db;

CREATE TABLE IF NOT EXISTS contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    types JSON NOT NULL,
    cities JSON NOT NULL,
    country VARCHAR(100),
    emails JSON NOT NULL,
    phones JSON NOT NULL,
    linkedin VARCHAR(500),
    instagram VARCHAR(255),
    sector VARCHAR(255),
    stage VARCHAR(100),
    tags JSON NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,
    INDEX idx_country (country),
    FULLTEXT idx_search (name, company, notes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
