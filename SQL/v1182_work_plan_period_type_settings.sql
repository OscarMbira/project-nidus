-- ================================================
-- File: v1182_work_plan_period_type_settings.sql
-- Description: Work Plan cadence (Weekly/Monthly) as an org-default + project-override setting,
--              reusing the exact same table pair/merge pattern already built for Timesheet
--              Settings (v1173) rather than a new settings table. NULL on the project-level
--              table means "inherit the organisation default", same semantics as every other
--              column in project_timesheet_settings.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

ALTER TABLE public.organisation_timesheet_settings
  ADD COLUMN IF NOT EXISTS work_plan_period_type VARCHAR(10) NOT NULL DEFAULT 'weekly';
ALTER TABLE public.organisation_timesheet_settings
  DROP CONSTRAINT IF EXISTS organisation_timesheet_settings_work_plan_period_type_check;
ALTER TABLE public.organisation_timesheet_settings
  ADD CONSTRAINT organisation_timesheet_settings_work_plan_period_type_check
  CHECK (work_plan_period_type IN ('weekly', 'monthly'));

ALTER TABLE public.project_timesheet_settings
  ADD COLUMN IF NOT EXISTS work_plan_period_type VARCHAR(10);
ALTER TABLE public.project_timesheet_settings
  DROP CONSTRAINT IF EXISTS project_timesheet_settings_work_plan_period_type_check;
ALTER TABLE public.project_timesheet_settings
  ADD CONSTRAINT project_timesheet_settings_work_plan_period_type_check
  CHECK (work_plan_period_type IS NULL OR work_plan_period_type IN ('weekly', 'monthly'));

COMMENT ON COLUMN public.organisation_timesheet_settings.work_plan_period_type IS 'v1182: Work Plan cadence default for the organisation — weekly or monthly.';
COMMENT ON COLUMN public.project_timesheet_settings.work_plan_period_type IS 'v1182: Per-project override of the organisation''s Work Plan cadence. NULL = inherit organisation default.';

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1182: work_plan_period_type added to organisation/project timesheet settings.';
  RAISE NOTICE '================================================';
END $$;
