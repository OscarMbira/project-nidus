-- =============================================================================
-- v1104: tasks.functional_role_id → project_functional_roles (optional role on task)
-- =============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS functional_role_id UUID
    REFERENCES public.project_functional_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_functional_role_id
  ON public.tasks (functional_role_id)
  WHERE functional_role_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_project_functional_role
  ON public.tasks (project_id, functional_role_id)
  WHERE functional_role_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

COMMENT ON COLUMN public.tasks.functional_role_id IS
  'v1104: Optional delivery role from project_functional_roles; skills are read from the role, not stored on the task.';

-- Simulator practice_tasks (if used); safe no-op when table/role table missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_tasks'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_project_functional_roles'
  ) THEN
    ALTER TABLE sim.practice_tasks
      ADD COLUMN IF NOT EXISTS functional_role_id UUID
        REFERENCES sim.practice_project_functional_roles(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_sim_practice_tasks_functional_role_id
      ON sim.practice_tasks (functional_role_id)
      WHERE functional_role_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v1104_tasks_functional_role_id.sql applied';
END $$;
