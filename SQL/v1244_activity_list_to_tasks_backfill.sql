-- ============================================================================
-- v1244: Backfill schedule activities (tasks) from estimating records (activity_list)
-- Plan: projectplan/v1239_dual_mode_planning_product_plan.md (Slice 2.3, decision D16)
--
-- The shared schedule screens read tasks / task_dependencies (D2). Projects whose schedule exists
-- only in activity_list would look empty, so for every non-deleted activity_list row with no
-- task_id — in projects that do not already schedule in tasks — this creates one tasks row and
-- links it back (projects with both are left for review: SQL/v1239_discovery_readonly.sql query 3); activity_dependencies between linked
-- activities become task_dependencies.
--
-- Safety:
--   * Every created task is tagged custom_fields.v1244_backfill = <batch id> (+ activity_list_id).
--   * public.v1244_backfill_log records batch id and counts per schema.
--   * Re-runnable: only unlinked activities are processed; existing dependencies are skipped.
--   * Undo: SQL/v1244r_activity_list_to_tasks_backfill_rollback.sql with the batch id.
-- Run AFTER v1242 and v1243.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.v1244_backfill_log (
  batch_id       UUID NOT NULL,
  schema_name    TEXT NOT NULL,
  tasks_created  INTEGER NOT NULL,
  deps_created   INTEGER NOT NULL,
  unlinked_after INTEGER NOT NULL,
  run_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (batch_id, schema_name)
);
ALTER TABLE public.v1244_backfill_log ENABLE ROW LEVEL SECURITY;  -- no policies: service/SQL-editor only

DO $$
DECLARE
  v_batch UUID := gen_random_uuid();
  v_tasks INTEGER;
  v_deps INTEGER;
  v_left INTEGER;
BEGIN
  -- ── public ────────────────────────────────────────────────────────────────
  WITH src AS (
    SELECT a.*
    FROM public.activity_list a
    WHERE a.task_id IS NULL AND COALESCE(a.is_deleted, FALSE) = FALSE
      -- Skip projects that already schedule in tasks (avoids duplicating the same work).
      AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.project_id = a.project_id
                      AND COALESCE(t.is_deleted, FALSE) = FALSE AND t.custom_fields->>'v1244_backfill' IS NULL)
  ), ins AS (
    INSERT INTO public.tasks (
      project_id, task_code, task_name, task_description, task_type, is_milestone,
      planned_start_date, planned_end_date, actual_start_date, actual_end_date,
      estimated_duration_days, custom_fields
    )
    SELECT
      src.project_id,
      LEFT(src.activity_code, 50),
      LEFT(COALESCE(NULLIF(trim(src.name), ''), 'Activity'), 200),
      src.description,
      CASE WHEN COALESCE(src.is_milestone, FALSE) THEN 'milestone' ELSE 'task' END,
      COALESCE(src.is_milestone, FALSE),
      src.planned_start_date,
      CASE WHEN src.planned_end_date < src.planned_start_date THEN src.planned_start_date ELSE src.planned_end_date END,
      src.actual_start_date,
      CASE WHEN src.actual_end_date < src.actual_start_date THEN src.actual_start_date ELSE src.actual_end_date END,
      CASE WHEN COALESCE(lower(src.duration_unit), 'days') IN ('day', 'days') THEN ROUND(src.expected_duration) END,
      jsonb_build_object('v1244_backfill', v_batch, 'activity_list_id', src.id)
    FROM src
    RETURNING id, (custom_fields->>'activity_list_id')::uuid AS activity_id
  )
  UPDATE public.activity_list a SET task_id = ins.id FROM ins WHERE a.id = ins.activity_id;
  GET DIAGNOSTICS v_tasks = ROW_COUNT;

  INSERT INTO public.task_dependencies (predecessor_task_id, successor_task_id, dependency_type, lag_days)
  SELECT p.task_id, s.task_id, d.dependency_type, ROUND(COALESCE(d.lag_days, 0))::int
  FROM public.activity_dependencies d
  JOIN public.activity_list p ON p.id = d.predecessor_activity_id AND p.task_id IS NOT NULL
  JOIN public.activity_list s ON s.id = d.successor_activity_id AND s.task_id IS NOT NULL
  WHERE COALESCE(d.is_deleted, FALSE) = FALSE
    AND p.task_id <> s.task_id
    AND NOT EXISTS (
      SELECT 1 FROM public.task_dependencies x
      WHERE x.predecessor_task_id = p.task_id AND x.successor_task_id = s.task_id
        AND x.dependency_type = d.dependency_type AND COALESCE(x.is_deleted, FALSE) = FALSE
    );
  GET DIAGNOSTICS v_deps = ROW_COUNT;

  SELECT COUNT(*) INTO v_left FROM public.activity_list WHERE task_id IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;
  INSERT INTO public.v1244_backfill_log VALUES (v_batch, 'public', v_tasks, v_deps, v_left);
  RAISE NOTICE 'v1244 public: batch %, % tasks created, % dependencies created, % activities still unlinked',
    v_batch, v_tasks, v_deps, v_left;

  -- ── sim ───────────────────────────────────────────────────────────────────
  WITH src AS (
    SELECT a.*
    FROM sim.activity_list a
    WHERE a.task_id IS NULL AND COALESCE(a.is_deleted, FALSE) = FALSE
      AND NOT EXISTS (SELECT 1 FROM sim.tasks t WHERE t.practice_project_id = a.practice_project_id
                      AND COALESCE(t.is_deleted, FALSE) = FALSE AND t.custom_fields->>'v1244_backfill' IS NULL)
  ), ins AS (
    INSERT INTO sim.tasks (
      practice_project_id, task_code, task_name, task_description, task_type, is_milestone,
      planned_start_date, planned_end_date, actual_start_date, actual_end_date,
      estimated_duration_days, custom_fields
    )
    SELECT
      src.practice_project_id,
      LEFT(src.activity_code, 50),
      LEFT(COALESCE(NULLIF(trim(src.name), ''), 'Activity'), 200),
      src.description,
      CASE WHEN COALESCE(src.is_milestone, FALSE) THEN 'milestone' ELSE 'task' END,
      COALESCE(src.is_milestone, FALSE),
      src.planned_start_date,
      CASE WHEN src.planned_end_date < src.planned_start_date THEN src.planned_start_date ELSE src.planned_end_date END,
      src.actual_start_date,
      CASE WHEN src.actual_end_date < src.actual_start_date THEN src.actual_start_date ELSE src.actual_end_date END,
      CASE WHEN COALESCE(lower(src.duration_unit), 'days') IN ('day', 'days') THEN ROUND(src.expected_duration) END,
      jsonb_build_object('v1244_backfill', v_batch, 'activity_list_id', src.id)
    FROM src
    RETURNING id, (custom_fields->>'activity_list_id')::uuid AS activity_id
  )
  UPDATE sim.activity_list a SET task_id = ins.id FROM ins WHERE a.id = ins.activity_id;
  GET DIAGNOSTICS v_tasks = ROW_COUNT;

  INSERT INTO sim.task_dependencies (predecessor_task_id, successor_task_id, dependency_type, lag_days)
  SELECT p.task_id, s.task_id, d.dependency_type, ROUND(COALESCE(d.lag_days, 0))::int
  FROM sim.activity_dependencies d
  JOIN sim.activity_list p ON p.id = d.predecessor_activity_id AND p.task_id IS NOT NULL
  JOIN sim.activity_list s ON s.id = d.successor_activity_id AND s.task_id IS NOT NULL
  WHERE COALESCE(d.is_deleted, FALSE) = FALSE
    AND p.task_id <> s.task_id
    AND NOT EXISTS (
      SELECT 1 FROM sim.task_dependencies x
      WHERE x.predecessor_task_id = p.task_id AND x.successor_task_id = s.task_id
        AND x.dependency_type = d.dependency_type AND COALESCE(x.is_deleted, FALSE) = FALSE
    );
  GET DIAGNOSTICS v_deps = ROW_COUNT;

  SELECT COUNT(*) INTO v_left FROM sim.activity_list WHERE task_id IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;
  INSERT INTO public.v1244_backfill_log VALUES (v_batch, 'sim', v_tasks, v_deps, v_left);
  RAISE NOTICE 'v1244 sim: batch %, % tasks created, % dependencies created, % activities still unlinked',
    v_batch, v_tasks, v_deps, v_left;
END $$;

-- Reconciliation: every non-deleted activity should now point at a task.
SELECT schema_name, batch_id, tasks_created, deps_created, unlinked_after, run_at
FROM public.v1244_backfill_log ORDER BY run_at DESC, schema_name;
