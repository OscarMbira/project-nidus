-- ============================================================================
-- v1265 S1: task outline (order + WBS code) and automatic summary tasks
-- PRD: projectprd/v1265_plan_sheet_and_task_classification_PRD.md (D1, D3, D4)
-- Plan: projectplan/v1265_plan_sheet_and_task_classification_plan.md (S1)
-- Run after v1245. Idempotent.
--
--   tasks.outline_position  position among siblings (same parent_task_id), 1-based. Outline
--                           numbers (1.1.2.3) are calculated from it, never stored (D1).
--   tasks.wbs_code          optional user-typed WBS code (client codes); does not renumber.
--   planning_expand_summaries(tasks, deps)
--       Summary task = a task with sub-tasks. Only leaf tasks are scheduled. A link to or from
--       a summary applies to every leaf under it; links between a summary and its own
--       descendants are ignored.
--   planning_rollup_summaries(tasks)
--       Summary dates / float / critical from its leaves; % complete weighted by leaf duration
--       (simple average when every leaf has zero duration).
--   planning_recalculate_schedule_impl: replaced (v1245) to use both; summaries are written
--       after their leaves.
-- Same rules as packages/planning/src/services/planOutline.js (client preview). Keep in step.
-- ============================================================================

-- ── Columns (both schemas) ──────────────────────────────────────────────────
DO $$
DECLARE s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    EXECUTE format('ALTER TABLE %I.tasks ADD COLUMN IF NOT EXISTS outline_position INTEGER', s);
    EXECUTE format('ALTER TABLE %I.tasks ADD COLUMN IF NOT EXISTS wbs_code TEXT', s);
    BEGIN
      EXECUTE format('ALTER TABLE %I.tasks ADD CONSTRAINT tasks_wbs_code_len CHECK (wbs_code IS NULL OR length(wbs_code) <= 50)', s);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tasks_outline ON %I.tasks (%I, parent_task_id, outline_position)',
                   s, s, CASE WHEN s = 'sim' THEN 'practice_project_id' ELSE 'project_id' END);
  END LOOP;
END $$;

COMMENT ON COLUMN public.tasks.outline_position IS 'v1265: 1-based position among sibling tasks (same parent). Outline numbers are calculated from it.';
COMMENT ON COLUMN public.tasks.wbs_code IS 'v1265: optional user-typed WBS code; separate from the calculated outline number.';

-- Backfill: number siblings in today's order (start date, then created) where not yet set.
DO $$
DECLARE s TEXT; fk TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    fk := CASE WHEN s = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
    EXECUTE format(
      'UPDATE %1$I.tasks t SET outline_position = o.pos
         FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY %2$I, parent_task_id
                                             ORDER BY planned_start_date NULLS LAST, created_at, id) AS pos
                 FROM %1$I.tasks WHERE COALESCE(is_deleted, FALSE) = FALSE) o
        WHERE t.id = o.id AND t.outline_position IS NULL', s, fk);
  END LOOP;
END $$;

-- ── Pure helpers ────────────────────────────────────────────────────────────
-- p_tasks: [{ id, parent, ...engine fields }]   p_deps: [{ pred, succ, type, lag }]
-- returns { tasks: [leaf rows], deps: [links between leaves] }
CREATE OR REPLACE FUNCTION public.planning_expand_summaries(p_tasks JSONB, p_deps JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  WITH RECURSIVE t AS (
    SELECT e->>'id' AS id, NULLIF(e->>'parent', '') AS parent, e AS row
    FROM jsonb_array_elements(COALESCE(p_tasks, '[]'::jsonb)) e
  ), known AS (
    -- a parent outside this set (deleted, other project) makes the task top level
    SELECT t.id, CASE WHEN EXISTS (SELECT 1 FROM t p WHERE p.id = t.parent) THEN t.parent END AS parent, t.row FROM t
  ), anc(node, anc, depth) AS (
    SELECT id, id, 0 FROM known
    UNION ALL
    SELECT k.id, a.anc, a.depth + 1 FROM known k JOIN anc a ON k.parent = a.node WHERE a.depth < 100
  ), leaf AS (
    SELECT k.id, k.row FROM known k WHERE NOT EXISTS (SELECT 1 FROM known c WHERE c.parent = k.id)
  ), leaves_of AS (
    SELECT a.anc AS of_id, a.node AS leaf_id FROM anc a JOIN leaf l ON l.id = a.node
  ), d AS (
    SELECT e->>'pred' AS pred, e->>'succ' AS succ, e AS row
    FROM jsonb_array_elements(COALESCE(p_deps, '[]'::jsonb)) e
  ), x AS (
    SELECT lp.leaf_id AS p, ls.leaf_id AS s, d.row
    FROM d
    JOIN leaves_of lp ON lp.of_id = d.pred
    JOIN leaves_of ls ON ls.of_id = d.succ
    WHERE lp.leaf_id <> ls.leaf_id
      AND NOT EXISTS (SELECT 1 FROM anc a WHERE (a.node = d.succ AND a.anc = d.pred) OR (a.node = d.pred AND a.anc = d.succ))
  )
  SELECT jsonb_build_object(
    'tasks', COALESCE((SELECT jsonb_agg(row ORDER BY id) FROM leaf), '[]'::jsonb),
    'deps',  COALESCE((SELECT jsonb_agg(row || jsonb_build_object('pred', p, 'succ', s)) FROM x), '[]'::jsonb)
  );
$$;

-- p_tasks: [{ id, parent, duration, pct, start, finish, es, ef, ls, lf, slack, critical }] with
-- leaf values filled in. Returns { <summary id>: { start, finish, es, ef, ls, lf, slack, critical, pct } }.
CREATE OR REPLACE FUNCTION public.planning_rollup_summaries(p_tasks JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  WITH RECURSIVE t AS (
    SELECT e->>'id' AS id, NULLIF(e->>'parent', '') AS parent, e AS row
    FROM jsonb_array_elements(COALESCE(p_tasks, '[]'::jsonb)) e
  ), known AS (
    SELECT t.id, CASE WHEN EXISTS (SELECT 1 FROM t p WHERE p.id = t.parent) THEN t.parent END AS parent, t.row FROM t
  ), anc(node, anc, depth) AS (
    SELECT id, id, 0 FROM known
    UNION ALL
    SELECT k.id, a.anc, a.depth + 1 FROM known k JOIN anc a ON k.parent = a.node WHERE a.depth < 100
  ), leaf AS (
    SELECT k.id, k.row FROM known k WHERE NOT EXISTS (SELECT 1 FROM known c WHERE c.parent = k.id)
  ), agg AS (
    SELECT a.anc AS sid,
           min(NULLIF(l.row->>'start', '')::date)  AS start_d,
           max(NULLIF(l.row->>'finish', '')::date) AS finish_d,
           min(NULLIF(l.row->>'es', '')::date) AS es, max(NULLIF(l.row->>'ef', '')::date) AS ef,
           min(NULLIF(l.row->>'ls', '')::date) AS ls, max(NULLIF(l.row->>'lf', '')::date) AS lf,
           min(NULLIF(l.row->>'slack', '')::int) AS slack,
           bool_or(COALESCE((l.row->>'critical')::boolean, FALSE)) AS critical,
           sum(GREATEST(COALESCE((l.row->>'duration')::numeric, 0), 0) * COALESCE((l.row->>'pct')::numeric, 0)) AS wsum,
           sum(GREATEST(COALESCE((l.row->>'duration')::numeric, 0), 0)) AS dsum,
           avg(COALESCE((l.row->>'pct')::numeric, 0)) AS pavg
    FROM anc a JOIN leaf l ON l.id = a.node
    WHERE a.node <> a.anc
    GROUP BY a.anc
  )
  SELECT COALESCE(jsonb_object_agg(sid, jsonb_build_object(
           'start', start_d, 'finish', finish_d, 'es', es, 'ef', ef, 'ls', ls, 'lf', lf,
           'slack', slack, 'critical', critical,
           'pct', round(CASE WHEN dsum > 0 THEN wsum / dsum ELSE pavg END, 2))), '{}'::jsonb)
  FROM agg;
$$;

-- ── Recalculation (replaces v1245's implementation; wrappers unchanged) ─────
CREATE OR REPLACE FUNCTION public.planning_recalculate_schedule_impl(
  p_schema TEXT, p_project_id UUID, p_expected_versions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
  v_fk TEXT := CASE WHEN p_schema = 'sim' THEN 'practice_project_id' ELSE 'project_id' END;
  v_start DATE;
  v_weekdays INT[];
  v_holidays DATE[];
  v_extra DATE[];
  v_tasks JSONB;
  v_deps JSONB;
  v_exp JSONB;
  v_conflicts TEXT;
  v_result JSONB;
  v_leaf_rows JSONB;
  v_summaries JSONB;
  v_updated INT;
  v_summary_count INT := 0;
BEGIN
  IF p_schema NOT IN ('public', 'sim') THEN RAISE EXCEPTION 'Unknown schema %', p_schema; END IF;

  -- 1. Lock this project's tasks for the whole recalculation.
  EXECUTE format('SELECT 1 FROM %I.tasks WHERE %I = $1 AND COALESCE(is_deleted, FALSE) = FALSE FOR UPDATE', p_schema, v_fk)
    USING p_project_id;

  -- 2. Optimistic concurrency: caller sends {task_id: row_version} for the rows it edited.
  IF p_expected_versions IS NOT NULL AND p_expected_versions <> '{}'::jsonb THEN
    EXECUTE format(
      'SELECT string_agg(t.id::text, '','') FROM %I.tasks t
         JOIN jsonb_each_text($1) e ON e.key::uuid = t.id
        WHERE t.%I = $2 AND t.row_version <> e.value::int', p_schema, v_fk)
      INTO v_conflicts USING p_expected_versions, p_project_id;
    IF v_conflicts IS NOT NULL THEN
      RAISE EXCEPTION 'SCHEDULE_CONFLICT: % changed since you loaded the plan', v_conflicts
        USING HINT = 'Reload the plan and apply your change again.';
    END IF;
  END IF;

  -- 3. Calendar (defaults Mon–Fri when the project has none).
  EXECUTE format(
    'SELECT ARRAY_REMOVE(ARRAY[CASE WHEN sunday THEN 0 END, CASE WHEN monday THEN 1 END, CASE WHEN tuesday THEN 2 END,
            CASE WHEN wednesday THEN 3 END, CASE WHEN thursday THEN 4 END, CASE WHEN friday THEN 5 END,
            CASE WHEN saturday THEN 6 END], NULL)
       FROM %I.project_calendars WHERE %I = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1', p_schema, v_fk)
    INTO v_weekdays USING p_project_id;
  v_weekdays := COALESCE(v_weekdays, ARRAY[1, 2, 3, 4, 5]);
  EXECUTE format(
    'SELECT COALESCE(array_agg(exception_date) FILTER (WHERE NOT is_working_day), ''{}''),
            COALESCE(array_agg(exception_date) FILTER (WHERE is_working_day), ''{}'')
       FROM %I.project_calendar_exceptions WHERE %I = $1 AND COALESCE(is_deleted, FALSE) = FALSE', p_schema, v_fk)
    INTO v_holidays, v_extra USING p_project_id;

  -- 4. Project start.
  IF p_schema = 'sim' THEN
    SELECT start_date INTO v_start FROM sim.practice_projects WHERE id = p_project_id;
  ELSE
    SELECT planned_start_date INTO v_start FROM public.projects WHERE id = p_project_id;
  END IF;

  -- 5. Tasks (with parent) and dependencies as engine input.
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(jsonb_build_object(
        ''id'', t.id,
        ''parent'', t.parent_task_id,
        ''duration'', CASE WHEN COALESCE(t.is_milestone, FALSE) THEN 0
                           ELSE COALESCE(t.estimated_duration_days,
                                CASE WHEN t.planned_start_date IS NOT NULL AND t.planned_end_date IS NOT NULL
                                     THEN public.planning_working_days_between(t.planned_start_date, t.planned_end_date, $2, $3, $4) + 1 END,
                                1) END,
        ''mode'', t.schedule_mode, ''start'', t.planned_start_date,
        ''constraint_type'', t.constraint_type, ''constraint_date'', t.constraint_date)), ''[]''::jsonb)
       FROM %I.tasks t WHERE t.%I = $1 AND COALESCE(t.is_deleted, FALSE) = FALSE', p_schema, v_fk)
    INTO v_tasks USING p_project_id, v_weekdays, v_holidays, v_extra;
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(jsonb_build_object(''pred'', d.predecessor_task_id, ''succ'', d.successor_task_id,
            ''type'', CASE upper(COALESCE(d.dependency_type, ''FS''))
                        WHEN ''FINISH_TO_START'' THEN ''FS'' WHEN ''START_TO_START'' THEN ''SS''
                        WHEN ''FINISH_TO_FINISH'' THEN ''FF'' WHEN ''START_TO_FINISH'' THEN ''SF''
                        ELSE upper(COALESCE(d.dependency_type, ''FS'')) END,
            ''lag'', COALESCE(d.lag_days, 0))), ''[]''::jsonb)
       FROM %I.task_dependencies d JOIN %I.tasks t ON t.id = d.successor_task_id
      WHERE t.%I = $1 AND COALESCE(d.is_deleted, FALSE) = FALSE', p_schema, p_schema, v_fk)
    INTO v_deps USING p_project_id;

  -- 6. Schedule leaf tasks only; links on summaries apply to their leaves (raises SCHEDULE_CYCLE on a loop).
  v_exp := public.planning_expand_summaries(v_tasks, v_deps);
  v_result := public.planning_schedule_compute(v_start, v_exp->'tasks', v_exp->'deps', v_weekdays, v_holidays, v_extra);

  -- 7. Write leaves back. Auto tasks also move their planned dates; manual tasks keep theirs.
  EXECUTE format(
    'UPDATE %I.tasks t SET
        earliest_start_date  = (r.value->>''es'')::date,
        earliest_finish_date = (r.value->>''ef'')::date,
        latest_start_date    = (r.value->>''ls'')::date,
        latest_finish_date   = (r.value->>''lf'')::date,
        slack_days           = (r.value->>''slack'')::int,
        is_critical_path     = (r.value->>''critical'')::boolean,
        planned_start_date   = CASE WHEN t.schedule_mode = ''manual'' THEN t.planned_start_date ELSE (r.value->>''es'')::date END,
        planned_end_date     = CASE WHEN t.schedule_mode = ''manual'' THEN t.planned_end_date ELSE (r.value->>''ef'')::date END
       FROM jsonb_each($1->''tasks'') r
      WHERE t.id = r.key::uuid AND t.%I = $2', p_schema, v_fk)
    USING v_result, p_project_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- 8. Summaries roll up from their (now updated) leaves (D3, D4).
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(jsonb_build_object(
        ''id'', t.id, ''parent'', t.parent_task_id,
        ''duration'', CASE WHEN COALESCE(t.is_milestone, FALSE) THEN 0 ELSE COALESCE(t.estimated_duration_days, 1) END,
        ''pct'', COALESCE(t.percentage_complete, 0),
        ''start'', t.planned_start_date, ''finish'', t.planned_end_date,
        ''es'', t.earliest_start_date, ''ef'', t.earliest_finish_date,
        ''ls'', t.latest_start_date, ''lf'', t.latest_finish_date,
        ''slack'', t.slack_days, ''critical'', t.is_critical_path)), ''[]''::jsonb)
       FROM %I.tasks t WHERE t.%I = $1 AND COALESCE(t.is_deleted, FALSE) = FALSE', p_schema, v_fk)
    INTO v_leaf_rows USING p_project_id;
  v_summaries := public.planning_rollup_summaries(v_leaf_rows);

  IF v_summaries <> '{}'::jsonb THEN
    EXECUTE format(
      'UPDATE %I.tasks t SET
          planned_start_date   = (r.value->>''start'')::date,
          planned_end_date     = (r.value->>''finish'')::date,
          earliest_start_date  = (r.value->>''es'')::date,
          earliest_finish_date = (r.value->>''ef'')::date,
          latest_start_date    = (r.value->>''ls'')::date,
          latest_finish_date   = (r.value->>''lf'')::date,
          slack_days           = (r.value->>''slack'')::int,
          is_critical_path     = COALESCE((r.value->>''critical'')::boolean, FALSE),
          percentage_complete  = COALESCE((r.value->>''pct'')::numeric, 0),
          is_milestone         = FALSE,
          estimated_duration_days = CASE
            WHEN r.value->>''start'' IS NULL OR r.value->>''finish'' IS NULL THEN t.estimated_duration_days
            ELSE public.planning_working_days_between((r.value->>''start'')::date, (r.value->>''finish'')::date, $3, $4, $5) + 1 END
         FROM jsonb_each($1) r
        WHERE t.id = r.key::uuid AND t.%I = $2', p_schema, v_fk)
      USING v_summaries, p_project_id, v_weekdays, v_holidays, v_extra;
    GET DIAGNOSTICS v_summary_count = ROW_COUNT;
  END IF;

  -- 9. Audit (public projects only; audit_log.record_id is the project).
  IF p_schema = 'public' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, action_details, performed_by)
    VALUES ('tasks', p_project_id, 'schedule_recalculated',
            jsonb_build_object('tasks_updated', v_updated, 'summaries_updated', v_summary_count, 'project_finish', v_result->'project_finish'),
            (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1));
  END IF;

  RETURN jsonb_build_object('tasks_updated', v_updated, 'summaries_updated', v_summary_count,
                            'project_finish', v_result->'project_finish', 'tasks', v_result->'tasks');
END;
$$;

REVOKE ALL ON FUNCTION public.planning_recalculate_schedule_impl(TEXT, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.planning_expand_summaries(JSONB, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.planning_rollup_summaries(JSONB) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v1265 S1: tasks.outline_position / wbs_code (public, sim) + summary-aware recalculation installed.';
END $$;
