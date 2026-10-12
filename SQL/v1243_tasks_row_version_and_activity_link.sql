-- ============================================================================
-- v1243: Scheduling columns on tasks + activity_list → tasks link (public and sim)
-- Plan: projectplan/v1239_dual_mode_planning_product_plan.md (Slice 2.2, decisions D2, D7, D16)
--
--   tasks.row_version      optimistic concurrency: bumped on every UPDATE; the schedule RPC
--                          (v1245) rejects a save made against an older version.
--   tasks.schedule_mode    'auto' (dates come from dependencies + calendar) | 'manual' (kept as typed)
--   tasks.constraint_type  'asap' | 'snet' (start no earlier than) | 'fnlt' (finish no later than) | 'mso' (must start on)
--   tasks.constraint_date  date used by snet / fnlt / mso
--   activity_list.task_id  link from the estimating record to its schedule activity (backfill: v1244)
-- Run AFTER v1242 (sim.tasks must exist). Idempotent.
-- ============================================================================

DO $$
DECLARE
  s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public', 'sim']
  LOOP
    EXECUTE format('ALTER TABLE %I.tasks ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1', s);
    EXECUTE format('ALTER TABLE %I.tasks ADD COLUMN IF NOT EXISTS schedule_mode TEXT NOT NULL DEFAULT ''auto''', s);
    EXECUTE format('ALTER TABLE %I.tasks ADD COLUMN IF NOT EXISTS constraint_type TEXT NOT NULL DEFAULT ''asap''', s);
    EXECUTE format('ALTER TABLE %I.tasks ADD COLUMN IF NOT EXISTS constraint_date DATE', s);

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_schedule_mode_check'
                   AND conrelid = format('%I.tasks', s)::regclass) THEN
      EXECUTE format('ALTER TABLE %I.tasks ADD CONSTRAINT tasks_schedule_mode_check CHECK (schedule_mode IN (''auto'', ''manual''))', s);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_constraint_type_check'
                   AND conrelid = format('%I.tasks', s)::regclass) THEN
      EXECUTE format('ALTER TABLE %I.tasks ADD CONSTRAINT tasks_constraint_type_check CHECK (constraint_type IN (''asap'', ''snet'', ''fnlt'', ''mso''))', s);
    END IF;

    EXECUTE format('ALTER TABLE %I.activity_list ADD COLUMN IF NOT EXISTS task_id UUID', s);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_list_task_fk'
                   AND conrelid = format('%I.activity_list', s)::regclass) THEN
      EXECUTE format('ALTER TABLE %I.activity_list ADD CONSTRAINT activity_list_task_fk FOREIGN KEY (task_id) REFERENCES %I.tasks(id) ON DELETE SET NULL', s, s);
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_activity_list_task_id ON %I.activity_list (task_id)', s);
  END LOOP;
END $$;

-- row_version bump (BEFORE UPDATE). Works for both schemas.
CREATE OR REPLACE FUNCTION public.bump_task_row_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_bump_row_version ON public.tasks;
CREATE TRIGGER trg_tasks_bump_row_version
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.bump_task_row_version();

DROP TRIGGER IF EXISTS trg_sim_tasks_bump_row_version ON sim.tasks;
CREATE TRIGGER trg_sim_tasks_bump_row_version
  BEFORE UPDATE ON sim.tasks
  FOR EACH ROW EXECUTE FUNCTION public.bump_task_row_version();

COMMENT ON COLUMN public.tasks.row_version IS 'v1243: optimistic-concurrency version, bumped on every update.';
COMMENT ON COLUMN public.tasks.schedule_mode IS 'v1243: auto = dates from dependencies + working calendar; manual = kept as entered.';
COMMENT ON COLUMN public.activity_list.task_id IS 'v1243: schedule activity (tasks row) this estimate belongs to.';

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v1243: tasks scheduling columns + activity_list.task_id added in public and sim.';
END $$;
