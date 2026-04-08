-- ============================================================================
-- v386: sim.practice_projects — project_manager_user_id (parity with public.projects)
-- Prerequisites: sim.practice_projects, public.users
-- Date: 2026-04-05
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'practice_projects' AND column_name = 'project_manager_user_id'
  ) THEN
    ALTER TABLE sim.practice_projects
      ADD COLUMN project_manager_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_practice_projects_project_manager_user_id
      ON sim.practice_projects(project_manager_user_id) WHERE is_deleted = FALSE AND project_manager_user_id IS NOT NULL;
    COMMENT ON COLUMN sim.practice_projects.project_manager_user_id IS 'Primary practice project manager (public.users.id); optional dual with practice_project_memberships';
  END IF;
END $$;
