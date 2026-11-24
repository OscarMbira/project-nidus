-- ============================================================================
-- v1572 — Resource levelling (v1354 slices 1 and 2)
-- Pin column, saved runs and moves, apply / undo / decide.
-- Then run Admin SQL v258 so new runs receive a display id.
-- Idempotent. Safe to re-run.
-- ============================================================================

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_level_pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sim.tasks ADD COLUMN IF NOT EXISTS is_level_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.levelling_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  project_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  scope TEXT NOT NULL DEFAULT 'project',
  mode TEXT NOT NULL DEFAULT 'within_float',
  status TEXT NOT NULL DEFAULT 'proposed',
  display_id TEXT NOT NULL DEFAULT '',
  finish_before DATE,
  finish_after DATE,
  finish_delay_days INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT levelling_runs_scope CHECK (scope IN ('project', 'cross_project')),
  CONSTRAINT levelling_runs_mode CHECK (mode IN ('within_float', 'beyond_float')),
  CONSTRAINT levelling_runs_status CHECK (status IN ('proposed', 'applied', 'undone'))
);
CREATE TABLE IF NOT EXISTS sim.levelling_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  project_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  scope TEXT NOT NULL DEFAULT 'project',
  mode TEXT NOT NULL DEFAULT 'within_float',
  status TEXT NOT NULL DEFAULT 'proposed',
  display_id TEXT NOT NULL DEFAULT '',
  finish_before DATE,
  finish_after DATE,
  finish_delay_days INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT levelling_runs_scope CHECK (scope IN ('project', 'cross_project')),
  CONSTRAINT levelling_runs_mode CHECK (mode IN ('within_float', 'beyond_float')),
  CONSTRAINT levelling_runs_status CHECK (status IN ('proposed', 'applied', 'undone'))
);

CREATE TABLE IF NOT EXISTS public.levelling_run_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.levelling_runs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  old_start DATE NOT NULL,
  old_end DATE,
  new_start DATE NOT NULL,
  new_end DATE,
  delay_days INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  accepted BOOLEAN,
  decided_at TIMESTAMPTZ,
  decided_by UUID
);
CREATE TABLE IF NOT EXISTS sim.levelling_run_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.levelling_runs(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES sim.tasks(id) ON DELETE CASCADE,
  old_start DATE NOT NULL,
  old_end DATE,
  new_start DATE NOT NULL,
  new_end DATE,
  delay_days INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  accepted BOOLEAN,
  decided_at TIMESTAMPTZ,
  decided_by UUID
);

CREATE INDEX IF NOT EXISTS idx_levelling_runs_project ON public.levelling_runs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sim_levelling_runs_project ON sim.levelling_runs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_levelling_moves_run ON public.levelling_run_moves (run_id);
CREATE INDEX IF NOT EXISTS idx_sim_levelling_moves_run ON sim.levelling_run_moves (run_id);

DROP TRIGGER IF EXISTS trg_levelling_runs_display_id ON public.levelling_runs;
CREATE TRIGGER trg_levelling_runs_display_id
  AFTER INSERT ON public.levelling_runs
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.levelling_runs', 'display_id');
DROP TRIGGER IF EXISTS trg_sim_levelling_runs_display_id ON sim.levelling_runs;
CREATE TRIGGER trg_sim_levelling_runs_display_id
  AFTER INSERT ON sim.levelling_runs
  FOR EACH ROW EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.levelling_runs', 'display_id');

-- Apply a preview. status 'applied' writes accepted moves after a stale-date check.
-- status 'proposed' only saves the run (cross-project). Unticked moves have accepted false.
CREATE OR REPLACE FUNCTION public.apply_levelling_run(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_id UUID;
  v_project UUID := NULLIF(p_payload->>'project_id', '')::UUID;
  v_status TEXT := COALESCE(p_payload->>'status', 'applied');
  v_move JSONB;
  v_task public.tasks%ROWTYPE;
  v_accepted BOOLEAN;
  v_uid UUID;
BEGIN
  IF v_status NOT IN ('applied', 'proposed') THEN
    RAISE EXCEPTION 'LEVEL_STATUS: Choose applied or proposed';
  END IF;
  IF v_project IS NOT NULL AND NOT public.auth_user_can_access_project(v_project) THEN
    RAISE EXCEPTION 'LEVEL_FORBIDDEN: You cannot level this project';
  END IF;
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  INSERT INTO public.levelling_runs (project_id, project_ids, scope, mode, status, finish_before, finish_after, finish_delay_days, created_by)
  VALUES (
    v_project,
    COALESCE(ARRAY(SELECT (jsonb_array_elements_text(COALESCE(p_payload->'project_ids', '[]'::jsonb)))::UUID), ARRAY[]::UUID[]),
    COALESCE(p_payload->>'scope', 'project'),
    COALESCE(p_payload->>'mode', 'within_float'),
    v_status,
    NULLIF(p_payload->>'finish_before', '')::DATE,
    NULLIF(p_payload->>'finish_after', '')::DATE,
    NULLIF(p_payload->>'finish_delay_days', '')::INTEGER,
    v_uid
  ) RETURNING id INTO v_id;

  FOR v_move IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'moves', '[]'::jsonb)) LOOP
    SELECT * INTO v_task FROM public.tasks WHERE id = (v_move->>'task_id')::UUID AND COALESCE(is_deleted, FALSE) = FALSE;
    IF v_task.id IS NULL THEN RAISE EXCEPTION 'LEVEL_TASK: A task in this preview no longer exists'; END IF;
    IF NOT public.auth_user_can_access_project(v_task.project_id) THEN
      RAISE EXCEPTION 'LEVEL_FORBIDDEN: You cannot move a task on a project you cannot access';
    END IF;
    v_accepted := COALESCE((v_move->>'accepted')::BOOLEAN, TRUE);
    IF v_status = 'proposed' THEN v_accepted := NULL; END IF;
    INSERT INTO public.levelling_run_moves (run_id, task_id, old_start, old_end, new_start, new_end, delay_days, reason, accepted)
    VALUES (
      v_id, v_task.id,
      (v_move->>'old_start')::DATE, NULLIF(v_move->>'old_end', '')::DATE,
      (v_move->>'new_start')::DATE, NULLIF(v_move->>'new_end', '')::DATE,
      COALESCE((v_move->>'delay_days')::INTEGER, 0), v_move->>'reason', v_accepted
    );
    IF v_status = 'applied' AND v_accepted IS TRUE THEN
      IF v_task.planned_start_date IS DISTINCT FROM (v_move->>'old_start')::DATE THEN
        RAISE EXCEPTION 'LEVEL_STALE: % has moved since this preview. Run levelling again.', COALESCE(v_task.task_name, 'A task');
      END IF;
      UPDATE public.tasks
         SET planned_start_date = (v_move->>'new_start')::DATE,
             planned_end_date = NULLIF(v_move->>'new_end', '')::DATE,
             updated_at = NOW()
       WHERE id = v_task.id;
    END IF;
  END LOOP;

  IF v_status = 'proposed'
     AND to_regprocedure('public.bj_project_role_users(text,uuid,text)') IS NOT NULL
     AND to_regprocedure('public.bj_notify(uuid,text,text,text,text,text,uuid,uuid,jsonb)') IS NOT NULL THEN
    PERFORM public.bj_notify(u, 'levelling_proposal', 'schedule',
      'Resource levelling to review',
      'A resource levelling proposal is waiting for your decision.',
      'levelling_run', v_id, pid, jsonb_build_object('run_id', v_id))
    FROM (
      SELECT DISTINCT t.project_id AS pid, unnest(public.bj_project_role_users('public', t.project_id, 'project_manager')) AS u
      FROM public.levelling_run_moves m
      JOIN public.tasks t ON t.id = m.task_id
      WHERE m.run_id = v_id
    ) n
    WHERE u IS NOT NULL;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION sim.apply_levelling_run(p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_id UUID;
  v_project UUID := NULLIF(p_payload->>'project_id', '')::UUID;
  v_status TEXT := COALESCE(p_payload->>'status', 'applied');
  v_move JSONB;
  v_task sim.tasks%ROWTYPE;
  v_accepted BOOLEAN;
BEGIN
  IF v_status NOT IN ('applied', 'proposed') THEN RAISE EXCEPTION 'LEVEL_STATUS: Choose applied or proposed'; END IF;
  IF v_project IS NOT NULL AND NOT sim.qra_can_access(v_project) THEN
    RAISE EXCEPTION 'LEVEL_FORBIDDEN: You cannot level this project';
  END IF;
  INSERT INTO sim.levelling_runs (project_id, project_ids, scope, mode, status, finish_before, finish_after, finish_delay_days, created_by)
  VALUES (
    v_project,
    COALESCE(ARRAY(SELECT (jsonb_array_elements_text(COALESCE(p_payload->'project_ids', '[]'::jsonb)))::UUID), ARRAY[]::UUID[]),
    COALESCE(p_payload->>'scope', 'project'),
    COALESCE(p_payload->>'mode', 'within_float'),
    v_status,
    NULLIF(p_payload->>'finish_before', '')::DATE,
    NULLIF(p_payload->>'finish_after', '')::DATE,
    NULLIF(p_payload->>'finish_delay_days', '')::INTEGER,
    auth.uid()
  ) RETURNING id INTO v_id;

  FOR v_move IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'moves', '[]'::jsonb)) LOOP
    SELECT * INTO v_task FROM sim.tasks WHERE id = (v_move->>'task_id')::UUID AND COALESCE(is_deleted, FALSE) = FALSE;
    IF v_task.id IS NULL THEN RAISE EXCEPTION 'LEVEL_TASK: A task in this preview no longer exists'; END IF;
    IF NOT sim.qra_can_access(v_task.practice_project_id) THEN
      RAISE EXCEPTION 'LEVEL_FORBIDDEN: You cannot move a task on a project you cannot access';
    END IF;
    v_accepted := COALESCE((v_move->>'accepted')::BOOLEAN, TRUE);
    IF v_status = 'proposed' THEN v_accepted := NULL; END IF;
    INSERT INTO sim.levelling_run_moves (run_id, task_id, old_start, old_end, new_start, new_end, delay_days, reason, accepted)
    VALUES (v_id, v_task.id, (v_move->>'old_start')::DATE, NULLIF(v_move->>'old_end', '')::DATE,
            (v_move->>'new_start')::DATE, NULLIF(v_move->>'new_end', '')::DATE,
            COALESCE((v_move->>'delay_days')::INTEGER, 0), v_move->>'reason', v_accepted);
    IF v_status = 'applied' AND v_accepted IS TRUE THEN
      IF v_task.planned_start_date IS DISTINCT FROM (v_move->>'old_start')::DATE THEN
        RAISE EXCEPTION 'LEVEL_STALE: % has moved since this preview. Run levelling again.', COALESCE(v_task.task_name, 'A task');
      END IF;
      UPDATE sim.tasks SET planned_start_date = (v_move->>'new_start')::DATE,
             planned_end_date = NULLIF(v_move->>'new_end', '')::DATE, updated_at = NOW()
       WHERE id = v_task.id;
    END IF;
  END LOOP;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_levelling_run(p_run_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_run public.levelling_runs%ROWTYPE;
  v_move public.levelling_run_moves%ROWTYPE;
  v_task public.tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_run FROM public.levelling_runs WHERE id = p_run_id;
  IF v_run.id IS NULL THEN RAISE EXCEPTION 'LEVEL_RUN: That levelling run was not found'; END IF;
  IF v_run.status <> 'applied' THEN RAISE EXCEPTION 'LEVEL_UNDO: Only an applied run can be undone'; END IF;
  IF v_run.project_id IS NOT NULL AND NOT public.auth_user_can_access_project(v_run.project_id) THEN
    RAISE EXCEPTION 'LEVEL_FORBIDDEN: You cannot undo this run';
  END IF;
  FOR v_move IN SELECT * FROM public.levelling_run_moves WHERE run_id = p_run_id AND accepted IS TRUE LOOP
    SELECT * INTO v_task FROM public.tasks WHERE id = v_move.task_id;
    IF v_task.planned_start_date IS DISTINCT FROM v_move.new_start THEN
      RAISE EXCEPTION 'LEVEL_STALE: % has moved since this run. Undo was not applied.', COALESCE(v_task.task_name, 'A task');
    END IF;
    UPDATE public.tasks SET planned_start_date = v_move.old_start, planned_end_date = v_move.old_end, updated_at = NOW()
     WHERE id = v_task.id;
  END LOOP;
  UPDATE public.levelling_runs SET status = 'undone', updated_at = NOW() WHERE id = p_run_id;
  RETURN p_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION sim.undo_levelling_run(p_run_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_run sim.levelling_runs%ROWTYPE;
  v_move sim.levelling_run_moves%ROWTYPE;
  v_task sim.tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_run FROM sim.levelling_runs WHERE id = p_run_id;
  IF v_run.id IS NULL THEN RAISE EXCEPTION 'LEVEL_RUN: That levelling run was not found'; END IF;
  IF v_run.status <> 'applied' THEN RAISE EXCEPTION 'LEVEL_UNDO: Only an applied run can be undone'; END IF;
  IF v_run.project_id IS NOT NULL AND NOT sim.qra_can_access(v_run.project_id) THEN
    RAISE EXCEPTION 'LEVEL_FORBIDDEN: You cannot undo this run';
  END IF;
  FOR v_move IN SELECT * FROM sim.levelling_run_moves WHERE run_id = p_run_id AND accepted IS TRUE LOOP
    SELECT * INTO v_task FROM sim.tasks WHERE id = v_move.task_id;
    IF v_task.planned_start_date IS DISTINCT FROM v_move.new_start THEN
      RAISE EXCEPTION 'LEVEL_STALE: % has moved since this run. Undo was not applied.', COALESCE(v_task.task_name, 'A task');
    END IF;
    UPDATE sim.tasks SET planned_start_date = v_move.old_start, planned_end_date = v_move.old_end, updated_at = NOW() WHERE id = v_task.id;
  END LOOP;
  UPDATE sim.levelling_runs SET status = 'undone', updated_at = NOW() WHERE id = p_run_id;
  RETURN p_run_id;
END;
$$;

-- A project manager accepts or rejects moves on their own project. Accepted moves are applied.
CREATE OR REPLACE FUNCTION public.decide_levelling_moves(p_run_id UUID, p_decisions JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_run public.levelling_runs%ROWTYPE;
  v_item JSONB;
  v_move public.levelling_run_moves%ROWTYPE;
  v_task public.tasks%ROWTYPE;
  v_uid UUID;
  v_accept BOOLEAN;
BEGIN
  SELECT * INTO v_run FROM public.levelling_runs WHERE id = p_run_id;
  IF v_run.id IS NULL OR v_run.status <> 'proposed' THEN
    RAISE EXCEPTION 'LEVEL_RUN: This proposal is no longer open';
  END IF;
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_decisions, '[]'::jsonb)) LOOP
    SELECT * INTO v_move FROM public.levelling_run_moves WHERE id = (v_item->>'id')::UUID AND run_id = p_run_id;
    IF v_move.id IS NULL THEN RAISE EXCEPTION 'LEVEL_MOVE: A move in this decision was not found'; END IF;
    SELECT * INTO v_task FROM public.tasks WHERE id = v_move.task_id;
    IF NOT public.auth_user_can_access_project(v_task.project_id) THEN
      RAISE EXCEPTION 'LEVEL_FORBIDDEN: You can only decide moves on your own project';
    END IF;
    v_accept := COALESCE((v_item->>'accepted')::BOOLEAN, FALSE);
    IF v_accept THEN
      IF v_task.planned_start_date IS DISTINCT FROM v_move.old_start THEN
        RAISE EXCEPTION 'LEVEL_STALE: % has moved since this proposal.', COALESCE(v_task.task_name, 'A task');
      END IF;
      UPDATE public.tasks SET planned_start_date = v_move.new_start, planned_end_date = v_move.new_end, updated_at = NOW()
       WHERE id = v_task.id;
    END IF;
    UPDATE public.levelling_run_moves
       SET accepted = v_accept, decided_at = NOW(), decided_by = v_uid
     WHERE id = v_move.id;
  END LOOP;
  RETURN p_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION sim.decide_levelling_moves(p_run_id UUID, p_decisions JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_run sim.levelling_runs%ROWTYPE;
  v_item JSONB;
  v_move sim.levelling_run_moves%ROWTYPE;
  v_task sim.tasks%ROWTYPE;
  v_accept BOOLEAN;
BEGIN
  SELECT * INTO v_run FROM sim.levelling_runs WHERE id = p_run_id;
  IF v_run.id IS NULL OR v_run.status <> 'proposed' THEN RAISE EXCEPTION 'LEVEL_RUN: This proposal is no longer open'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_decisions, '[]'::jsonb)) LOOP
    SELECT * INTO v_move FROM sim.levelling_run_moves WHERE id = (v_item->>'id')::UUID AND run_id = p_run_id;
    IF v_move.id IS NULL THEN RAISE EXCEPTION 'LEVEL_MOVE: A move in this decision was not found'; END IF;
    SELECT * INTO v_task FROM sim.tasks WHERE id = v_move.task_id;
    IF NOT sim.qra_can_access(v_task.practice_project_id) THEN
      RAISE EXCEPTION 'LEVEL_FORBIDDEN: You can only decide moves on your own project';
    END IF;
    v_accept := COALESCE((v_item->>'accepted')::BOOLEAN, FALSE);
    IF v_accept THEN
      IF v_task.planned_start_date IS DISTINCT FROM v_move.old_start THEN
        RAISE EXCEPTION 'LEVEL_STALE: % has moved since this proposal.', COALESCE(v_task.task_name, 'A task');
      END IF;
      UPDATE sim.tasks SET planned_start_date = v_move.new_start, planned_end_date = v_move.new_end, updated_at = NOW() WHERE id = v_task.id;
    END IF;
    UPDATE sim.levelling_run_moves SET accepted = v_accept, decided_at = NOW(), decided_by = auth.uid() WHERE id = v_move.id;
  END LOOP;
  RETURN p_run_id;
END;
$$;

ALTER TABLE public.levelling_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levelling_run_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.levelling_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.levelling_run_moves ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.levelling_runs, public.levelling_run_moves TO authenticated;
GRANT SELECT ON sim.levelling_runs, sim.levelling_run_moves TO authenticated;
GRANT ALL ON public.levelling_runs, public.levelling_run_moves, sim.levelling_runs, sim.levelling_run_moves TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_levelling_run(JSONB), public.undo_levelling_run(UUID), public.decide_levelling_moves(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.apply_levelling_run(JSONB), sim.undo_levelling_run(UUID), sim.decide_levelling_moves(UUID, JSONB) TO authenticated;

DROP POLICY IF EXISTS levelling_runs_select ON public.levelling_runs;
CREATE POLICY levelling_runs_select ON public.levelling_runs FOR SELECT TO authenticated
  USING (
    public.auth_user_can_access_project(project_id)
    OR EXISTS (SELECT 1 FROM unnest(project_ids) pid WHERE public.auth_user_can_access_project(pid))
  );
DROP POLICY IF EXISTS levelling_moves_select ON public.levelling_run_moves;
CREATE POLICY levelling_moves_select ON public.levelling_run_moves FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.levelling_runs r
    WHERE r.id = run_id AND (
      public.auth_user_can_access_project(r.project_id)
      OR EXISTS (SELECT 1 FROM unnest(r.project_ids) pid WHERE public.auth_user_can_access_project(pid))
    )
  ));
DROP POLICY IF EXISTS levelling_runs_select ON sim.levelling_runs;
CREATE POLICY levelling_runs_select ON sim.levelling_runs FOR SELECT TO authenticated
  USING (
    sim.qra_can_access(project_id)
    OR EXISTS (SELECT 1 FROM unnest(project_ids) pid WHERE sim.qra_can_access(pid))
  );
DROP POLICY IF EXISTS levelling_moves_select ON sim.levelling_run_moves;
CREATE POLICY levelling_moves_select ON sim.levelling_run_moves FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.levelling_runs r
    WHERE r.id = run_id AND (
      sim.qra_can_access(r.project_id)
      OR EXISTS (SELECT 1 FROM unnest(r.project_ids) pid WHERE sim.qra_can_access(pid))
    )
  ));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('levelling_runs', 'Saved resource levelling runs', FALSE, TRUE),
  ('levelling_run_moves', 'Tasks a levelling run would move', FALSE, TRUE),
  ('sim.levelling_runs', 'Simulator resource levelling runs', FALSE, TRUE),
  ('sim.levelling_run_moves', 'Simulator levelling moves', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('levelling_runs'), ('levelling_run_moves')
ON CONFLICT (table_name) DO NOTHING;

-- Moves waiting for a project manager. The reminder job reads this view.
CREATE OR REPLACE VIEW public.levelling_moves_due AS
SELECT m.id, COALESCE(t.task_name, 'Task') AS title, t.project_id, r.created_at
FROM public.levelling_run_moves m
JOIN public.levelling_runs r ON r.id = m.run_id
JOIN public.tasks t ON t.id = m.task_id
WHERE r.status = 'proposed' AND m.accepted IS NULL AND COALESCE(t.is_deleted, FALSE) = FALSE;
CREATE OR REPLACE VIEW sim.levelling_moves_due AS
SELECT m.id, COALESCE(t.task_name, 'Task') AS title, t.practice_project_id, r.created_at
FROM sim.levelling_run_moves m
JOIN sim.levelling_runs r ON r.id = m.run_id
JOIN sim.tasks t ON t.id = m.task_id
WHERE r.status = 'proposed' AND m.accepted IS NULL AND COALESCE(t.is_deleted, FALSE) = FALSE;
REVOKE ALL ON public.levelling_moves_due, sim.levelling_moves_due FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.reminder_messages') IS NULL OR to_regclass('public.reminder_record_types') IS NULL THEN
    RAISE NOTICE 'SKIP levelling reminder — run SQL/v1562_reminders_lead_times_daily_digest.sql, then re-run this file.';
    RETURN;
  END IF;
  INSERT INTO public.reminder_messages (message_key, before_title, before_body, overdue_title, overdue_body)
  VALUES (
    'levelling_decision',
    'Levelling decision due {date}',
    'A proposed move for “{title}” is waiting for your decision.',
    'Levelling decision overdue',
    'The proposed move for “{title}” has been waiting since {date}.'
  )
  ON CONFLICT (message_key) DO UPDATE SET
    before_title = EXCLUDED.before_title, before_body = EXCLUDED.before_body,
    overdue_title = EXCLUDED.overdue_title, overdue_body = EXCLUDED.overdue_body, updated_at = NOW();
  INSERT INTO public.reminder_record_types (schema_name, record_type, label, description, table_name, id_column, date_column,
    due_offset_days, title_column, project_column, account_column, owner_columns, owner_id_kind, status_filter,
    recipient_rule, default_lead_days, overdue_window_days, message_key, planner_tables, sort_order)
  VALUES
    ('public', 'levelling_decision', 'Levelling decisions', 'Proposed resource moves waiting for the project manager.',
     'levelling_moves_due', 'id', 'created_at', 0, 'title', 'project_id', NULL, ARRAY[]::TEXT[], 'user',
     'TRUE', 'role:project_manager', 2, 14, 'levelling_decision', ARRAY['levelling_runs', 'levelling_run_moves', 'tasks'], 80),
    ('sim', 'levelling_decision', 'Levelling decisions', 'Proposed practice-project moves waiting for the project manager.',
     'levelling_moves_due', 'id', 'created_at', 0, 'title', 'practice_project_id', NULL, ARRAY[]::TEXT[], 'auth',
     'TRUE', 'role:project_manager', 2, 14, 'levelling_decision', ARRAY['sim.levelling_runs', 'sim.levelling_run_moves'], 80)
  ON CONFLICT (schema_name, record_type) DO UPDATE SET
    label = EXCLUDED.label, description = EXCLUDED.description, table_name = EXCLUDED.table_name,
    date_column = EXCLUDED.date_column, title_column = EXCLUDED.title_column, project_column = EXCLUDED.project_column,
    recipient_rule = EXCLUDED.recipient_rule, message_key = EXCLUDED.message_key, planner_tables = EXCLUDED.planner_tables,
    updated_at = NOW();
END $$;

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.tasks.is_level_pinned', 'Keep this date', 'When ticked, resource levelling never moves this task. Use it for a date that cannot slip, such as a booked site visit.', '- Ticked', NULL, NULL, 'planning'),
  ('public.levelling_runs.mode', 'How far tasks may move', 'Within float keeps the project finish date. Beyond float may move the finish when that is the only way to remove the overload.', '- Within float', NULL, NULL, 'planning'),
  ('public.levelling_runs.scope', 'Which projects', 'One project, or several projects that share people. Across projects, the higher-priority project keeps its dates.', '- This project', NULL, NULL, 'planning')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.tasks.is_level_pinned', 'public.tasks.is_level_pinned'),
  ('sim.levelling_runs.mode', 'public.levelling_runs.mode'),
  ('sim.levelling_runs.scope', 'public.levelling_runs.scope')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;
