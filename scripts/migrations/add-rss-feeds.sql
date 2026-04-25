-- RSS feeds and processed items for cron-based feed ingestion.
-- Run once: mysql -u ... -p zox_db < scripts/migrations/add-rss-feeds.sql

USE zox_db;

CREATE TABLE IF NOT EXISTS rss_feeds (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT 'Display name for the feed',
    url VARCHAR(500) NOT NULL COMMENT 'RSS feed URL',
    category_id INT NOT NULL COMMENT 'Default category for posts from this feed',
    author_id INT NOT NULL COMMENT 'Default author for posts from this feed',
    enabled TINYINT(1) DEFAULT 1,
    fetch_interval_minutes INT DEFAULT 10 COMMENT 'Minimum minutes between fetches',
    last_fetched_at TIMESTAMP NULL,
    last_error TEXT NULL,
    error_count INT DEFAULT 0,
    max_items_per_fetch INT DEFAULT 10,
    auto_publish TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_enabled (enabled),
    INDEX idx_last_fetched (last_fetched_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rss_feed_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rss_feed_id INT NOT NULL,
    guid VARCHAR(500) NOT NULL COMMENT 'Unique id from feed (or link if no guid)',
    title VARCHAR(500) NOT NULL,
    link VARCHAR(1000) NOT NULL COMMENT 'Original article URL',
    description TEXT,
    content TEXT,
    image_url VARCHAR(500),
    published_at TIMESTAMP NULL,
    processed TINYINT(1) DEFAULT 0,
    post_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rss_feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    UNIQUE KEY unique_guid_per_feed (rss_feed_id, guid(255)),
    INDEX idx_processed (processed),
    INDEX idx_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
