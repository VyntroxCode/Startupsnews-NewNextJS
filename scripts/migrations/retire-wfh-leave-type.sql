-- Retire Work From Home (WFH) as a leave type.
--
-- Background: employees could apply for leave type 'WFH'. On approval, HrToolService wrote every
-- working day of the range into hr_attendance as a full shift (status 'WFH'), which payroll then
-- paid as Present. That mechanism (syncWfhAttendance / isApprovedWfhDay) has been removed from the
-- code, and submitEmployeeLeaveRequest now rejects the type.
--
-- Policy: KEEP PAST, CANCEL FUTURE.
--   * Past approved WFH days stay exactly as they are — still full days, still paid. Payroll keeps
--     skipping WFH requests in approvedLeaveDates so those days are not double-counted as leave.
--   * Pending WFH requests are rejected.
--   * Approved WFH requests starting after today are rejected; ones spanning today are trimmed to
--     end today, so their past days stay backed by an approved request.
--   * Future WFH attendance rows (after today) are deleted — those days now need a real punch.
--   * Frozen payroll months (hr_payroll_entries) are never touched.
--
-- "Today" is UTC_DATE() because the app's todayStr() is UTC (src/modules/hr-tool/utils/time.ts).
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/retire-wfh-leave-type.sql
USE zox_db;

START TRANSACTION;

UPDATE hr_leave_requests
   SET status = 'rejected', stage = 'done', hr_remarks = 'Work From Home discontinued'
 WHERE type = 'WFH' AND status = 'pending';

UPDATE hr_leave_requests
   SET status = 'rejected', stage = 'done', hr_remarks = 'Work From Home discontinued'
 WHERE type = 'WFH' AND status = 'approved' AND from_date > UTC_DATE();

UPDATE hr_leave_requests
   SET to_date = UTC_DATE()
 WHERE type = 'WFH' AND status = 'approved' AND from_date <= UTC_DATE() AND to_date > UTC_DATE();

DELETE FROM hr_attendance
 WHERE status = 'WFH' AND attendance_date > UTC_DATE();

COMMIT;
