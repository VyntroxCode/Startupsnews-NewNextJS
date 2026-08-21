-- CTC Structure redesign: Basic is % of monthly salary (same column/meaning as before — a fixed
-- ratio, so annual vs monthly makes no numeric difference). HRA is now % of BASIC instead of an
-- independent % of total CTC (same column repurposed; value reset to the new 50% default since
-- the old stored number meant something different). Convenience Allowance is new — admin picks
-- either a flat Rupees/month amount or a % of monthly salary. Special Allowance is no longer a
-- stored percentage at all — it's always the remainder (monthly salary − Basic − HRA −
-- Convenience), computed on the fly wherever CTC is shown. ctc_allowances_pct is left in place
-- but no longer read/written.
-- Run once: mysql -u zox_user -p zox_db < scripts/migrations/add-hr-rules-ctc-convenience.sql

USE zox_db;

ALTER TABLE hr_rules
  ADD COLUMN ctc_convenience_type VARCHAR(10) NOT NULL DEFAULT 'amount' AFTER ctc_allowances_pct,
  ADD COLUMN ctc_convenience_value DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER ctc_convenience_type;

UPDATE hr_rules SET ctc_basic_pct = 50, ctc_hra_pct = 50, ctc_convenience_type = 'amount', ctc_convenience_value = 0;
