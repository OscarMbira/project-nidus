-- ============================================================================
-- v492: public.task_statuses — GRANT + RLS (403 / permission denied for table)
-- Date: 2026-04-20
--
-- Problem:
--   Dashboard executive summary queries tasks with an embedded FK:
--     .select('status_id, task_statuses(status_code, status_name)')
--   PostgREST must be able to SELECT from task_statuses for that join. If the
--   authenticated role has no table GRANT and/or RLS is enabled without a
--   matching SELECT policy, Postgres returns 42501 and the client shows 403 /
--   "permission denied for table task_statuses".
--
-- Fix:
--   GRANT SELECT, ENABLE ROW LEVEL SECURITY, permissive SELECT for reference rows
--   (non-deleted workflow definitions used by tasks across projects).
-- Prerequisites: public.task_statuses (v06_task_management_tables.sql)
-- ============================================================================

GRANT SELECT ON public.task_statuses TO authenticated;
GRANT ALL ON public.task_statuses TO service_role;

ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_statuses_authenticated_select ON public.task_statuses;

CREATE POLICY task_statuses_authenticated_select
  ON public.task_statuses
  FOR SELECT
  TO authenticated
  USING (COALESCE(is_deleted, FALSE) = FALSE);

COMMENT ON POLICY task_statuses_authenticated_select ON public.task_statuses IS
  'Reference read for task workflow statuses (dashboard task embeds + task UI).';
