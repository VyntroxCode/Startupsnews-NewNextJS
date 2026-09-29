-- HR Offboarding, phase 2 (clearance checklist, lead handover, reinstate). Run after add-hr-offboarding.sql.
--
-- 1. At most ONE open exit (pending / accepted / exited) per employee, enforced by the database so two
--    submissions racing each other (double-click, two tabs, employee + HR at the same moment) can't
--    both land. MariaDB allows many NULLs in a UNIQUE index, so closed cases don't collide.
-- 2. The employee's status just before the exit took effect, so "Reinstate" (an exit done by mistake)
--    puts back probation vs active instead of guessing.
-- 3. A checklist item appears once per case, so seeding the checklist twice can't duplicate it.
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-offboarding-phase2.sql
USE zox_db;

ALTER TABLE hr_offboarding
    ADD COLUMN IF NOT EXISTS open_employee_id VARCHAR(20)
        AS (IF(status IN ('pending', 'accepted', 'exited'), employee_id, NULL)) PERSISTENT,
    ADD COLUMN IF NOT EXISTS prior_employee_status VARCHAR(20) NULL;

ALTER TABLE hr_offboarding ADD UNIQUE KEY IF NOT EXISTS uniq_open_case (open_employee_id);

ALTER TABLE hr_offboarding_clearance ADD UNIQUE KEY IF NOT EXISTS uniq_case_item (offboarding_id, category, item);
