-- Grant zox_user read-only access to WordPress DB so migrate-from-wordpress can run.
-- Run as MySQL/MariaDB root: mysql -u root -p < scripts/grant-wp-access.sql
-- Or: sudo mysql < scripts/grant-wp-access.sql

GRANT SELECT ON wp_startupnews.* TO 'zox_user'@'127.0.0.1';
FLUSH PRIVILEGES;
