-- ================================================
-- File: v1178_timesheet_entries_work_location.sql
-- Description: Per-row Onsite/Offsite flag on timesheet_entries, scoped to the Overtime grid
--              (each split row can represent a different working location — e.g. an after-hours
--              row completed onsite plus an emergency row responded to offsite). A fixed 2-option
--              CHECK constraint, not a lookup table, matching the existing day-level onsite/
--              offshore toggle's own pattern (timesheet_day_locations, v1170) rather than the
--              richer timesheet_overtime_types catalog (v1174).
--              Deliberately a DIFFERENT column/table from timesheet_day_locations.work_location:
--              that one is a once-per-day flag ('onsite'/'offshore') driving the main weekly grid's
--              header toggle; this one is once-per-ENTRY-ROW ('onsite'/'offsite') so a day split
--              into multiple overtime rows (v1173 split rows) can carry a different location per
--              row. Same column name reused across two different tables/grains intentionally —
--              no FK/relationship between them.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

ALTER TABLE public.timesheet_entries ADD COLUMN IF NOT EXISTS work_location VARCHAR(10);
ALTER TABLE sim.timesheet_entries ADD COLUMN IF NOT EXISTS work_location VARCHAR(10);

ALTER TABLE public.timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_work_location_check;
ALTER TABLE public.timesheet_entries ADD CONSTRAINT timesheet_entries_work_location_check
  CHECK (work_location IS NULL OR work_location IN ('onsite', 'offsite'));

ALTER TABLE sim.timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_work_location_check;
ALTER TABLE sim.timesheet_entries ADD CONSTRAINT timesheet_entries_work_location_check
  CHECK (work_location IS NULL OR work_location IN ('onsite', 'offsite'));

COMMENT ON COLUMN public.timesheet_entries.work_location IS 'Per-row Onsite/Offsite flag (v1178), currently wired on the Overtime grid only. Distinct from timesheet_day_locations.work_location (day-level onsite/offshore toggle on the main weekly grid, v1170) — same column name, different table/grain, no relationship.';
COMMENT ON COLUMN sim.timesheet_entries.work_location IS 'Per-row Onsite/Offsite flag (v1178), currently wired on the Overtime grid only. Distinct from timesheet_day_locations.work_location (day-level onsite/offshore toggle on the main weekly grid, v1170) — same column name, different table/grain, no relationship.';

-- Avoid the PostgREST schema-cache staleness seen after v1174's ALTER TABLE (fixed in v1176).
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1178: timesheet_entries.work_location added (public + sim).';
  RAISE NOTICE '================================================';
END $$;
