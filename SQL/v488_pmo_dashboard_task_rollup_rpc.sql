-- v488 — Single-query task aggregates for PMO extended metrics (avoids loading all task rows client-side).
-- Run on Supabase (PostgreSQL 15). SECURITY INVOKER so tasks RLS applies.

CREATE OR REPLACE FUNCTION public.pmo_dashboard_task_rollup(p_project_ids uuid[])
RETURNS TABLE (
  avg_percentage_complete numeric,
  milestone_total bigint,
  milestone_done bigint,
  overdue_incomplete bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    AVG(t.percentage_complete)::numeric,
    COUNT(*) FILTER (WHERE t.is_milestone IS TRUE),
    COUNT(*) FILTER (WHERE t.is_milestone IS TRUE AND COALESCE(t.percentage_complete, 0) >= 100),
    COUNT(*) FILTER (
      WHERE COALESCE(t.percentage_complete, 0) < 100
        AND COALESCE(t.planned_end_date, t.due_date) IS NOT NULL
        AND COALESCE(t.planned_end_date, t.due_date) < CURRENT_DATE
    )
  FROM public.tasks t
  WHERE t.is_deleted = false
    AND t.project_id = ANY(p_project_ids);
$$;

COMMENT ON FUNCTION public.pmo_dashboard_task_rollup(uuid[]) IS
  'PMO dashboard: avg task %, milestone counts, overdue incomplete tasks — O(1) rows instead of scanning all tasks in JS.';

REVOKE ALL ON FUNCTION public.pmo_dashboard_task_rollup(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pmo_dashboard_task_rollup(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pmo_dashboard_task_rollup(uuid[]) TO service_role;

-- Speed up critical-path dashboard query (filter is_critical_path = true).
CREATE INDEX IF NOT EXISTS idx_tasks_project_critical_path
  ON public.tasks (project_id)
  WHERE is_deleted = false AND is_critical_path = true;
