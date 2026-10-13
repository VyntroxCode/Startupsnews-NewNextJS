-- Re-key hr_employees from the internal "E-101" series to the real Employee ID ("SNFYI-0026").
--
-- Background: hr_employees.id was a hidden key made by nextEmployeeId() ("E-" + max+1, floor 100),
-- separate from the Employee ID HR issues (hr_employee_credentials.employee_code). Two series for
-- one person. This makes hr_employees.id equal to that person's employee_code, and carries the new
-- key into every column that stores it. The code change (newEmployeeId in
-- src/components/admin/hr-tool/utils.tsx) makes new records take the code as their key.
--
-- What it touches: hr_employees.id / .manager_id, hr_teams.manager_id, and employee_id in
-- hr_attendance, hr_attendance_overrides, hr_punch_log, hr_regularizations, hr_leave_requests,
-- hr_expenses, hr_tickets, hr_payroll_entries, hr_document_upload_requests, hr_onboarding,
-- hr_offboarding. Nothing else changes — no row is added or removed.
--   * hr_offboarding.open_employee_id is a GENERATED column; it follows employee_id by itself.
--   * hr_regularizations.id ("R-HRE-E-103-20260905-in" on seeded rows) is an opaque record id that
--     no code parses, so it is left alone.
--   * There are no foreign keys on these columns, so nothing cascades — every table is listed here.
--   * updated_at is deliberately kept as it was (`updated_at = updated_at`) on the tables that
--     auto-stamp it: payroll compares request updated_at against the last run to spot changes, and a
--     re-key is not a change to the record.
--
-- Safety:
--   * Refuses to start (nothing changed) if any Directory record has no Employee ID login, if two
--     records share one login, if a code is longer than the 20-character key, or if a code is
--     already in use as another record's key.
--   * Copies every touched table to zz_empkey_bak_<table> first (kept if it already exists).
--   * All updates run in ONE transaction; it rolls back if the number of rows attached to an
--     employee differs in any table afterwards.
--   * Records old -> new in zz_empkey_map. Undo with rollback-rekey-hr-employees-to-employee-code.sql.
--   * Safe to run again: already-renamed records are skipped.
--
-- Run it with the HR Tool closed everywhere: a tab opened before the rename still holds the old
-- keys, and its saves would write them back. Everyone refreshes afterwards.
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/rekey-hr-employees-to-employee-code.sql
USE zox_db;

DROP PROCEDURE IF EXISTS zz_rekey_hr_employees;

DELIMITER $$
CREATE PROCEDURE zz_rekey_hr_employees()
BEGIN
  DECLARE n INT DEFAULT 0;
  DECLARE detail VARCHAR(90) DEFAULT '';
  DECLARE msg VARCHAR(128) DEFAULT '';
  DECLARE employees_before INT DEFAULT 0;
  DECLARE attached_before BIGINT DEFAULT 0;
  DECLARE attached_after BIGINT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  -- ---- Preconditions: stop before anything is changed ----
  SELECT COUNT(*), LEFT(COALESCE(GROUP_CONCAT(e.id, ' ', e.name SEPARATOR ', '), ''), 90) INTO n, detail
    FROM hr_employees e LEFT JOIN hr_employee_credentials c ON c.id = e.credential_id
   WHERE c.id IS NULL;
  IF n > 0 THEN
    SET msg = CONCAT('No Employee ID login: ', detail);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = msg;
  END IF;

  SELECT COUNT(*) INTO n FROM (SELECT credential_id FROM hr_employees GROUP BY credential_id HAVING COUNT(*) > 1) d;
  IF n > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Two Directory records share one Employee ID login'; END IF;

  SELECT COUNT(*), LEFT(COALESCE(GROUP_CONCAT(c.employee_code SEPARATOR ', '), ''), 90) INTO n, detail
    FROM hr_employees e JOIN hr_employee_credentials c ON c.id = e.credential_id
   WHERE CHAR_LENGTH(c.employee_code) > 20;
  IF n > 0 THEN
    SET msg = CONCAT('Employee ID longer than 20 characters: ', detail);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = msg;
  END IF;

  SELECT COUNT(*) INTO n
    FROM hr_employees e JOIN hr_employee_credentials c ON c.id = e.credential_id
    JOIN hr_employees other ON other.id = c.employee_code AND other.credential_id <> e.credential_id;
  IF n > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An Employee ID is already used as another record''s key'; END IF;

  -- ---- Backups + the old -> new map (DDL, so before the transaction) ----
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_employees AS SELECT * FROM hr_employees;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_teams AS SELECT * FROM hr_teams;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_attendance AS SELECT * FROM hr_attendance;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_attendance_overrides AS SELECT * FROM hr_attendance_overrides;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_punch_log AS SELECT * FROM hr_punch_log;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_regularizations AS SELECT * FROM hr_regularizations;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_leave_requests AS SELECT * FROM hr_leave_requests;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_expenses AS SELECT * FROM hr_expenses;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_tickets AS SELECT * FROM hr_tickets;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_payroll_entries AS SELECT * FROM hr_payroll_entries;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_document_upload_requests AS SELECT * FROM hr_document_upload_requests;
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_onboarding AS SELECT * FROM hr_onboarding;
  -- Without the generated open_employee_id column, which a plain copy would turn into a normal one.
  CREATE TABLE IF NOT EXISTS zz_empkey_bak_hr_offboarding AS SELECT id, employee_id, credential_id, status FROM hr_offboarding;

  CREATE TABLE IF NOT EXISTS zz_empkey_map (
    old_id VARCHAR(20) NOT NULL PRIMARY KEY,
    new_id VARCHAR(20) NOT NULL,
    mapped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
  -- A key that is in use again today (reissued by an older build) gets a fresh mapping.
  DELETE m FROM zz_empkey_map m JOIN hr_employees e ON e.id = m.old_id;
  INSERT INTO zz_empkey_map (old_id, new_id)
  SELECT e.id, c.employee_code
    FROM hr_employees e JOIN hr_employee_credentials c ON c.id = e.credential_id
   WHERE e.id <> c.employee_code;

  -- ---- The rename, all or nothing ----
  START TRANSACTION;

  SELECT COUNT(*) INTO employees_before FROM hr_employees;
  SELECT
      (SELECT COUNT(*) FROM hr_attendance t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_attendance_overrides t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_punch_log t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_regularizations t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_leave_requests t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_expenses t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_tickets t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_payroll_entries t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_document_upload_requests t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_onboarding t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_offboarding t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_teams t JOIN hr_employees e ON e.id = t.manager_id)
    + (SELECT COUNT(*) FROM hr_employees t JOIN hr_employees e ON e.id = t.manager_id)
    INTO attached_before;

  UPDATE hr_attendance t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id;
  UPDATE hr_attendance_overrides t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id;
  UPDATE hr_punch_log t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id;
  UPDATE hr_regularizations t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id, t.updated_at = t.updated_at;
  UPDATE hr_leave_requests t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id, t.updated_at = t.updated_at;
  UPDATE hr_expenses t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id;
  UPDATE hr_tickets t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id;
  UPDATE hr_payroll_entries t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id;
  UPDATE hr_document_upload_requests t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id;
  UPDATE hr_onboarding t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id, t.updated_at = t.updated_at;
  UPDATE hr_offboarding t JOIN zz_empkey_map m ON m.old_id = t.employee_id SET t.employee_id = m.new_id, t.updated_at = t.updated_at;
  UPDATE hr_teams t JOIN zz_empkey_map m ON m.old_id = t.manager_id SET t.manager_id = m.new_id;
  UPDATE hr_employees t JOIN zz_empkey_map m ON m.old_id = t.manager_id SET t.manager_id = m.new_id, t.updated_at = t.updated_at;
  UPDATE hr_employees t JOIN zz_empkey_map m ON m.old_id = t.id SET t.id = m.new_id, t.updated_at = t.updated_at;

  -- ---- Checks, still inside the transaction ----
  SELECT COUNT(*) INTO n FROM hr_employees;
  IF n <> employees_before THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee count changed - rolled back'; END IF;

  SELECT COUNT(*) INTO n FROM hr_employees e JOIN hr_employee_credentials c ON c.id = e.credential_id WHERE e.id <> c.employee_code;
  IF n > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A record did not take its Employee ID - rolled back'; END IF;

  SELECT
      (SELECT COUNT(*) FROM hr_attendance t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_attendance_overrides t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_punch_log t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_regularizations t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_leave_requests t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_expenses t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_tickets t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_payroll_entries t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_document_upload_requests t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_onboarding t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_offboarding t JOIN hr_employees e ON e.id = t.employee_id)
    + (SELECT COUNT(*) FROM hr_teams t JOIN hr_employees e ON e.id = t.manager_id)
    + (SELECT COUNT(*) FROM hr_employees t JOIN hr_employees e ON e.id = t.manager_id)
    INTO attached_after;
  -- ">=" not "=": a re-run may re-attach rows an old tab wrote under a retired key.
  IF attached_after < attached_before THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rows lost their employee - rolled back'; END IF;

  COMMIT;

  SELECT employees_before AS employees, attached_before AS rows_attached_before, attached_after AS rows_attached_after,
         (SELECT COUNT(*) FROM zz_empkey_map) AS keys_mapped;
END $$
DELIMITER ;

CALL zz_rekey_hr_employees();
DROP PROCEDURE IF EXISTS zz_rekey_hr_employees;
