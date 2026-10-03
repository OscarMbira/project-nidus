-- ================================================
-- File: v1188_work_plan_items_reference.sql
-- Description: Adds a free-text Reference field to Work Plan items (v1180) — matches the
--              original sample sheet's "REF (Where Applicable)" column, e.g. a defect/ticket ID
--              (MANTIS-1234, DEF-456) when the planned item is resolving a specific external
--              item. Distinct from Details (the description) and from task_label (v1186, a
--              free-text task name) — this is specifically an external reference code.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

ALTER TABLE public.project_work_plan_items ADD COLUMN IF NOT EXISTS reference_code VARCHAR(100);

COMMENT ON COLUMN public.project_work_plan_items.reference_code IS 'v1188: free-text external reference (defect/ticket ID etc.) — matches the original sample sheet''s "REF (Where Applicable)" column.';

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1188: project_work_plan_items.reference_code added.';
  RAISE NOTICE '================================================';
END $$;
