-- Rollback of add-sales-lead-created-by.sql: drops the "who created this lead" columns.
-- Run only with the code that reads them rolled back too. Leads themselves are untouched, but
-- employees lose access to leads they created and are not assigned to.
-- Run: docker exec -i zox-mariadb mariadb -u zox_user -p zox_db < scripts/migrations/rollback-add-sales-lead-created-by.sql
USE zox_db;

ALTER TABLE sales_leads
  DROP INDEX IF EXISTS idx_created_by_credential,
  DROP COLUMN IF EXISTS created_by_name,
  DROP COLUMN IF EXISTS created_by_credential_id;
