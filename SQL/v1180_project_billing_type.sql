-- ================================================
-- File: v1180_project_billing_type.sql
-- Description: Adds a billing_type classification to projects (v1180 — Work Plans vs
--              Timesheet Comparison). No value today means "unset" — PMs opt a project into
--              Time & Material explicitly; nothing changes for existing projects by default.
--              Work Plan capture itself (v1183+) is available regardless of this value; only
--              the automatic planned-vs-actual comparison feature is gated on
--              billing_type = 'time_and_material'.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS billing_type VARCHAR(20);

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_billing_type_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_billing_type_check
  CHECK (billing_type IS NULL OR billing_type IN ('time_and_material', 'fixed_price'));

COMMENT ON COLUMN public.projects.billing_type IS 'v1180: Time & Material vs Fixed Price classification. NULL = unset. Gates the Work Plan vs Timesheet comparison feature (time_and_material only) — Work Plan capture itself is available on any project regardless.';

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1180: projects.billing_type added.';
  RAISE NOTICE '================================================';
END $$;
