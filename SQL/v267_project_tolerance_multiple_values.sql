-- ================================================
-- File: v267_project_tolerance_multiple_values.sql
-- Description: Allow time and cost tolerances to store multiple values (newline-separated text).
-- Drops numeric constraints and changes columns to TEXT for list storage.
-- Version: 1.0
-- ================================================

-- Drop numeric constraints so we can store text (multiple values as newline-separated)
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_tolerance_time_days;

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS chk_projects_tolerance_cost_percentage;

-- Change time and cost tolerance columns to TEXT (store one value per line, e.g. "7\n14")
-- Existing integer/decimal values cast to text (e.g. 7 -> '7', 10.5 -> '10.5')
ALTER TABLE projects
ALTER COLUMN tolerance_time_days TYPE TEXT USING (tolerance_time_days::TEXT);

ALTER TABLE projects
ALTER COLUMN tolerance_cost_percentage TYPE TEXT USING (tolerance_cost_percentage::TEXT);

COMMENT ON COLUMN projects.tolerance_time_days IS 'Time tolerance(s) in days, one per line (e.g. 7, 14)';
COMMENT ON COLUMN projects.tolerance_cost_percentage IS 'Cost tolerance(s) as percentage, one per line (e.g. 10, 15)';
