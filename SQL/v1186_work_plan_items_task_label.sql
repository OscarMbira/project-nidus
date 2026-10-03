-- ================================================
-- File: v1186_work_plan_items_task_label.sql
-- Description: Replaces the Work Plan item "Task" field's UI from a linked-Task dropdown with
--              free text — adds a nullable task_label column for it. The existing task_id FK
--              (v1183) stays on the table (still usable for the Task-tier of
--              matchWorkPlanItemToTimesheetEntries if populated some other way later), but this
--              grid's own Task field no longer writes to it; matching degrades gracefully to the
--              work_category tier for items without a task_id, same as any item that never had
--              one.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

ALTER TABLE public.project_work_plan_items ADD COLUMN IF NOT EXISTS task_label TEXT;

COMMENT ON COLUMN public.project_work_plan_items.task_label IS 'v1186: free-text Task label (not linked to public.tasks) — the Work Plan grid''s Task field is free text, not a picker. Distinct from task_id (v1183), which remains a real FK for any other matching path.';

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1186: project_work_plan_items.task_label added.';
  RAISE NOTICE '================================================';
END $$;
