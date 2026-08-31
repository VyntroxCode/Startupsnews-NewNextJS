-- Converts hr_rules.leave_types from the old on/off shape to one that carries a monthly
-- allowance, and applies the requested default of "Casual only".
--
--   before:  {"Casual": true, "Sick": true, "Earned": true, ...}
--   after:   {"Casual": {"enabled": true, "perMonth": 1}, "Sick": {"enabled": false, ...}, ...}
--
-- The application does NOT depend on this migration to avoid crashing: normalizeLeaveTypes()
-- in src/modules/hr-tool/domain/types.ts accepts either shape on read and maps a legacy `true`
-- to {enabled: true, perMonth: 1}. What this migration does is apply the *policy* decision —
-- every type except Casual switched off — which the normalizer deliberately will not do on its
-- own, because silently disabling a live leave type on read would be wrong.
--
-- NOTE: this replaces the whole column. If an admin had added a CUSTOM leave type it is not
-- preserved and must be re-added under Rules -> Leave types. Check first with:
--   SELECT leave_types FROM hr_rules WHERE id = 1;
--
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/convert-hr-rules-leave-types.sql

USE zox_db;

UPDATE hr_rules
SET leave_types = JSON_OBJECT(
  'Casual',    JSON_OBJECT('enabled', TRUE,  'perMonth', 1),
  'Sick',      JSON_OBJECT('enabled', FALSE, 'perMonth', 0),
  'Earned',    JSON_OBJECT('enabled', FALSE, 'perMonth', 0),
  'Maternity', JSON_OBJECT('enabled', FALSE, 'perMonth', 0),
  'Paternity', JSON_OBJECT('enabled', FALSE, 'perMonth', 0),
  'Comp-off',  JSON_OBJECT('enabled', FALSE, 'perMonth', 0)
)
WHERE id = 1;
