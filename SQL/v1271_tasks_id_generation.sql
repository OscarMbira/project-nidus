-- ============================================================================
-- v1271: Tasks — Admin ID Generation on task_code (rule 16.2)
-- ============================================================================
-- Tasks never had an ID rule or display-ID trigger, so every task created in the app (and the
-- v1270 sample plan) was saved with a blank task_code. This script:
--   1. ensures the Admin ID rules (same result as
--      E:\project-nidus-admin\SQL\v234_tasks_id_generation_seed.sql):
--        TSK-0001  public.tasks  (Platform / Planner)
--        STSK-0001 sim.tasks     (Simulator)
--      numbered across all projects: the Admin engine keeps every generated code unique per table
--      (admin.generated_ids), so per-project numbering would repeat TSK-0001 and fail;
--   2. wires the shared AFTER INSERT trigger on both tables (blank task_code → generated);
--   3. starts the counter after the highest TSK- / STSK- code already in use (safe after a
--      partly-run earlier attempt);
--   4. gives every existing task with a blank task_code its code, oldest first.
--      Tasks that already have a code (e.g. hand-typed seed codes) are not changed.
-- Stops before changing anything if TSK / STSK is already used by another table's rule.
-- Idempotent: safe to re-run.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_admin UUID;
  v_rule_id UUID;
  v_taken TEXT;
BEGIN
  SELECT id INTO v_admin
  FROM admin.admin_users
  WHERE activation_status = 'active'
  ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, created_at
  LIMIT 1;
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No active admin user found. Activate an admin user, then re-run this script.';
  END IF;

  FOR r IN
    SELECT *
    FROM (
      VALUES
        ('public.tasks'::text, 'TSK'::varchar, 'Task references (Platform / Planner)'::text, ''::text, 4),
        ('sim.tasks'::text, 'STSK'::varchar, 'Task references (Simulator)'::text, ''::text, 4)
    ) AS t(target_table, table_abbreviation, table_description, scope_column, num_digits)
  LOOP
    -- the prefix must not belong to another table's rule
    SELECT target_table INTO v_taken
    FROM admin.id_generation_rules
    WHERE upper(table_abbreviation) = upper(r.table_abbreviation)
      AND admin.normalize_id_generation_target_table(target_table) <> admin.normalize_id_generation_target_table(r.target_table)
    LIMIT 1;
    IF v_taken IS NOT NULL THEN
      RAISE EXCEPTION 'Prefix % is already used by the ID rule for %. Choose another prefix for % and re-run.', r.table_abbreviation, v_taken, r.target_table;
    END IF;

    SELECT id INTO v_rule_id
    FROM admin.id_generation_rules
    WHERE admin.normalize_id_generation_target_table(target_table)
        = admin.normalize_id_generation_target_table(r.target_table)
    LIMIT 1;

    -- sequential, no date part: TSK-0001
    IF v_rule_id IS NOT NULL THEN
      PERFORM admin.update_id_generation_rule(
        v_rule_id, r.target_table, r.table_abbreviation, r.table_description,
        '-', '', 'uppercase', 'numeric', 0, r.num_digits, '', 1, TRUE, v_admin,
        'sequential', FALSE, 'YYYY', r.scope_column
      );
    ELSE
      PERFORM admin.create_id_generation_rule(
        r.target_table, r.table_abbreviation, r.table_description,
        '-', '', 'uppercase', 'numeric', 0, r.num_digits, '', 1, TRUE, v_admin,
        'sequential', FALSE, 'YYYY', r.scope_column
      );
    END IF;
  END LOOP;
END $$;

-- Counter: continue after the highest code already used (generated earlier, or typed on a task).
DO $$
DECLARE
  r RECORD;
  v_rule UUID;
  v_max BIGINT;
BEGIN
  FOR r IN SELECT * FROM (VALUES ('public.tasks', 'TSK'), ('sim.tasks', 'STSK')) AS t(target_table, prefix) LOOP
    SELECT id INTO v_rule FROM admin.id_generation_rules
    WHERE admin.normalize_id_generation_target_table(target_table) = admin.normalize_id_generation_target_table(r.target_table)
    LIMIT 1;
    SELECT COALESCE(MAX(substring(display_id FROM '^' || r.prefix || '-(\d+)$')::BIGINT), 0) INTO v_max
    FROM admin.generated_ids WHERE target_table = r.target_table;
    IF r.target_table = 'public.tasks' THEN
      SELECT GREATEST(v_max, COALESCE(MAX(substring(task_code FROM '^TSK-(\d+)$')::BIGINT), 0)) INTO v_max FROM public.tasks;
    ELSE
      SELECT GREATEST(v_max, COALESCE(MAX(substring(task_code FROM '^STSK-(\d+)$')::BIGINT), 0)) INTO v_max FROM sim.tasks;
    END IF;
    INSERT INTO admin.id_generation_sequences (rule_id, scope_value, period_key, current_value)
    VALUES (v_rule, NULL, NULL, v_max)
    ON CONFLICT ON CONSTRAINT uq_id_generation_sequences_rule_scope_period
    DO UPDATE SET current_value = GREATEST(admin.id_generation_sequences.current_value, EXCLUDED.current_value), updated_at = NOW();
    RAISE NOTICE 'v1271: % counter starts after %', r.prefix, v_max;
  END LOOP;
END $$;

-- New tasks: blank task_code → generated after insert.
DROP TRIGGER IF EXISTS trg_tasks_admin_display_id ON public.tasks;
CREATE TRIGGER trg_tasks_admin_display_id
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.tasks', 'task_code');

DROP TRIGGER IF EXISTS trg_sim_tasks_admin_display_id ON sim.tasks;
CREATE TRIGGER trg_sim_tasks_admin_display_id
  AFTER INSERT ON sim.tasks
  FOR EACH ROW
  EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.tasks', 'task_code');

-- Existing tasks with a blank code, oldest first (so numbers follow creation order).
DO $$
DECLARE
  r RECORD;
  v_ref TEXT;
  v_public INT := 0;
  v_sim INT := 0;
BEGIN
  FOR r IN
    SELECT id FROM public.tasks
    WHERE COALESCE(is_deleted, FALSE) = FALSE AND (task_code IS NULL OR btrim(task_code) = '')
    ORDER BY created_at NULLS LAST, project_id, outline_position NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('public.tasks', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE public.tasks SET task_code = v_ref WHERE id = r.id;
      v_public := v_public + 1;
    END IF;
  END LOOP;

  FOR r IN
    SELECT id FROM sim.tasks
    WHERE COALESCE(is_deleted, FALSE) = FALSE AND (task_code IS NULL OR btrim(task_code) = '')
    ORDER BY created_at NULLS LAST, practice_project_id, outline_position NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('sim.tasks', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE sim.tasks SET task_code = v_ref WHERE id = r.id;
      v_sim := v_sim + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'v1271: task codes assigned — public %, sim %.', v_public, v_sim;
END $$;

-- Anything still blank (should be none)
SELECT 'public' AS schema, COUNT(*) FILTER (WHERE COALESCE(btrim(task_code), '') = '') AS still_blank, COUNT(*) AS tasks
FROM public.tasks WHERE COALESCE(is_deleted, FALSE) = FALSE
UNION ALL
SELECT 'sim', COUNT(*) FILTER (WHERE COALESCE(btrim(task_code), '') = ''), COUNT(*)
FROM sim.tasks WHERE COALESCE(is_deleted, FALSE) = FALSE;
