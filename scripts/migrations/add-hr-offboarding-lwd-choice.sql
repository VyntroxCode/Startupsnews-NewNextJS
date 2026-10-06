-- HR Offboarding: three resignation dates + "left early" recovery. Run after add-hr-offboarding-phase2.sql.
--
-- The system date is resignation_date + 30 days (NOTICE_DAYS in code — no column). The employee's
-- requested date is the existing requested_lwd. HR accepts with one of three dates; approved_lwd holds
-- the final one, and:
-- 1. lwd_choice — which date HR accepted with: 'requested' | 'system' | 'custom'. NULL for terminations
--    and cases accepted before this migration.
-- 2. agreed_lwd — set only when HR records "Employee left early": the last day HR had agreed. approved_lwd
--    then becomes the day they actually left, and F&F recovers the days in between (the `left-early` line).
--
-- Until this runs, accepting still works (only the label is lost); "left early" refuses with a message.
-- The notice_days_* columns of hr_offboarding_settings are no longer read (notice is fixed at 30).
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-offboarding-lwd-choice.sql
USE zox_db;

ALTER TABLE hr_offboarding
    ADD COLUMN IF NOT EXISTS lwd_choice VARCHAR(10) NULL AFTER approved_lwd,
    ADD COLUMN IF NOT EXISTS agreed_lwd DATE NULL AFTER lwd_choice;
