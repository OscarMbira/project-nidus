-- ================================================
-- File: v1173b_organisation_timesheet_settings_seed.sql
-- Description: Seed organisation_timesheet_settings with sensible defaults for every existing
--              account that doesn't already have a row. Idempotent — never overwrites an admin's
--              existing settings.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1173_timesheet_overtime_and_settings.sql

INSERT INTO public.organisation_timesheet_settings (account_id, standard_daily_hours, max_overtime_per_day, max_overtime_per_week, working_days)
SELECT a.id, 8, 4, 10, ARRAY['mon','tue','wed','thu','fri']
FROM public.accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.organisation_timesheet_settings s
  WHERE s.account_id = a.id AND COALESCE(s.is_deleted, FALSE) = FALSE
)
ON CONFLICT (account_id) DO NOTHING;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.organisation_timesheet_settings WHERE is_deleted = FALSE;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Accounts with timesheet settings: %', v_count;
    RAISE NOTICE '================================================';
END $$;
