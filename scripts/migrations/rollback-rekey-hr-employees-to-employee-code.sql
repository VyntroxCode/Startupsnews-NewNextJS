-- Undo rekey-hr-employees-to-employee-code.sql: puts the old "E-1xx" keys back, using the
-- old -> new map that migration saved in zz_empkey_map. One transaction; rolls back if any record
-- ends up without its old key. Rows are only renamed, never added or removed, and updated_at is
-- kept as it was.
--
-- Only for records that existed at the time of the rename: an employee hired afterwards has no old
-- key and keeps their Employee ID as key (which the older build handles fine).
-- Deploy the previous build with this, or new hires keep getting Employee-ID keys.
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/rollback-rekey-hr-employees-to-employee-code.sql
USE zox_db;

DROP PROCEDURE IF EXISTS zz_unrekey_hr_employees;

DELIMITER $$
CREATE PROCEDURE zz_unrekey_hr_employees()
BEGIN
  DECLARE n INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  SELECT COUNT(*) INTO n FROM zz_empkey_map m JOIN hr_employees e ON e.id = m.old_id;
  IF n > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An old key is in use again - cannot restore automatically'; END IF;

  START TRANSACTION;

  UPDATE hr_attendance t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id;
  UPDATE hr_attendance_overrides t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id;
  UPDATE hr_punch_log t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id;
  UPDATE hr_regularizations t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id, t.updated_at = t.updated_at;
  UPDATE hr_leave_requests t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id, t.updated_at = t.updated_at;
  UPDATE hr_expenses t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id;
  UPDATE hr_tickets t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id;
  UPDATE hr_payroll_entries t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id;
  UPDATE hr_document_upload_requests t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id;
  UPDATE hr_onboarding t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id, t.updated_at = t.updated_at;
  UPDATE hr_offboarding t JOIN zz_empkey_map m ON m.new_id = t.employee_id SET t.employee_id = m.old_id, t.updated_at = t.updated_at;
  UPDATE hr_teams t JOIN zz_empkey_map m ON m.new_id = t.manager_id SET t.manager_id = m.old_id;
  UPDATE hr_employees t JOIN zz_empkey_map m ON m.new_id = t.manager_id SET t.manager_id = m.old_id, t.updated_at = t.updated_at;
  UPDATE hr_employees t JOIN zz_empkey_map m ON m.new_id = t.id SET t.id = m.old_id, t.updated_at = t.updated_at;

  SELECT COUNT(*) INTO n FROM zz_empkey_map m JOIN hr_employees e ON e.id = m.new_id;
  IF n > 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A record kept its new key - rolled back'; END IF;

  COMMIT;

  SELECT COUNT(*) AS keys_restored FROM zz_empkey_map m JOIN hr_employees e ON e.id = m.old_id;
END $$
DELIMITER ;

CALL zz_unrekey_hr_employees();
DROP PROCEDURE IF EXISTS zz_unrekey_hr_employees;
