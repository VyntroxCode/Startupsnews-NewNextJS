-- HR punch clock windows (2026-10-05).
-- Punch In is accepted only between punch_in_from and punch_in_to, Punch Out up to punch_out_to
-- (before punch_out_from only after a punch-in that day — early leave). Regularization requests use
-- the same windows. "HH:MM", IST, both ends inclusive. Editable on HR tool → Rules.
-- Safe to re-run.

ALTER TABLE hr_rules ADD COLUMN IF NOT EXISTS punch_in_from VARCHAR(5) NULL DEFAULT '09:00' AFTER shift_grace_minutes;
ALTER TABLE hr_rules ADD COLUMN IF NOT EXISTS punch_in_to VARCHAR(5) NULL DEFAULT '15:00' AFTER punch_in_from;
ALTER TABLE hr_rules ADD COLUMN IF NOT EXISTS punch_out_from VARCHAR(5) NULL DEFAULT '15:00' AFTER punch_in_to;
ALTER TABLE hr_rules ADD COLUMN IF NOT EXISTS punch_out_to VARCHAR(5) NULL DEFAULT '23:59' AFTER punch_out_from;

UPDATE hr_rules SET
  punch_in_from = COALESCE(punch_in_from, '09:00'),
  punch_in_to = COALESCE(punch_in_to, '15:00'),
  punch_out_from = COALESCE(punch_out_from, '15:00'),
  punch_out_to = COALESCE(punch_out_to, '23:59');
