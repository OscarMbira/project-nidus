-- ================================================
-- File: v1175_timesheet_entries_start_end_time.sql
-- Description: Optional start_time/end_time capture on timesheet_entries — Log Time form and
--              the Overtime grid. TIME columns (not TIMESTAMPTZ): entry_date already anchors
--              the calendar day, so a plain time-of-day avoids unnecessary timezone handling
--              for what's fundamentally a "what time did you start/stop" field. A shift that
--              crosses midnight is expressed as end_time < start_time (interpreted as spanning
--              into the next calendar day) rather than needing a second date column — the
--              existing sample data already includes night-shift entries, so this is a real
--              case, not a hypothetical one.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

ALTER TABLE public.timesheet_entries ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.timesheet_entries ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE sim.timesheet_entries ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE sim.timesheet_entries ADD COLUMN IF NOT EXISTS end_time TIME;

COMMENT ON COLUMN public.timesheet_entries.start_time IS 'Optional clock-in time (v1175). When both start_time and end_time are set, hours_worked is derived from the range at the application layer (end_time < start_time = spans past midnight) rather than typed manually.';
COMMENT ON COLUMN public.timesheet_entries.end_time IS 'Optional clock-out time (v1175). See start_time.';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1175: timesheet_entries.start_time / end_time added (public + sim).';
  RAISE NOTICE '================================================';
END $$;
