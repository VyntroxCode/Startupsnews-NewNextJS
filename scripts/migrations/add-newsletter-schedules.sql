CREATE TABLE IF NOT EXISTS newsletter_schedules (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject       VARCHAR(500) NOT NULL,
  html          LONGTEXT NOT NULL,
  recipient_filter JSON NOT NULL COMMENT '"all" or array of category slugs, or {customRecipients:[...]}',
  scheduled_at  DATETIME NOT NULL,
  status        ENUM('pending','sending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
  sent_count    INT UNSIGNED NOT NULL DEFAULT 0,
  total_count   INT UNSIGNED NOT NULL DEFAULT 0,
  error_log     TEXT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at       DATETIME NULL,
  INDEX idx_status_scheduled (status, scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
