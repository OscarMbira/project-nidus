-- ============================================================================
-- v434: Agile gap (v350) — agile_releases, release_stories, kanban_classes_of_service
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.agile_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  release_name VARCHAR(200) NOT NULL,
  release_version VARCHAR(50),
  target_date DATE,
  release_status VARCHAR(30) NOT NULL DEFAULT 'planned'
    CHECK (release_status IN ('planned', 'in_progress', 'released', 'cancelled')),
  release_goal TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agile_releases_project ON public.agile_releases(project_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.release_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES public.agile_releases(id) ON DELETE CASCADE,
  user_story_id UUID NOT NULL REFERENCES public.user_stories(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (release_id, user_story_id)
);

CREATE INDEX IF NOT EXISTS idx_release_stories_release ON public.release_stories(release_id);
CREATE INDEX IF NOT EXISTS idx_release_stories_story ON public.release_stories(user_story_id);

ALTER TABLE public.agile_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_agile_releases_all ON public.agile_releases;
CREATE POLICY policy_agile_releases_all ON public.agile_releases
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id) AND COALESCE(is_deleted, FALSE) = FALSE)
  WITH CHECK (public.auth_user_can_access_project(project_id));

ALTER TABLE public.release_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_release_stories_all ON public.release_stories;
CREATE POLICY policy_release_stories_all ON public.release_stories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agile_releases r
      WHERE r.id = release_id AND public.auth_user_can_access_project(r.project_id) AND COALESCE(r.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agile_releases r
      WHERE r.id = release_id AND public.auth_user_can_access_project(r.project_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agile_releases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_stories TO authenticated;

CREATE TABLE IF NOT EXISTS public.kanban_classes_of_service (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  policy TEXT,
  color VARCHAR(20),
  wip_limit INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_kanban_cos_board ON public.kanban_classes_of_service(board_id) WHERE is_deleted = FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'kanban_cards' AND column_name = 'class_of_service_id'
  ) THEN
    ALTER TABLE public.kanban_cards
      ADD COLUMN class_of_service_id UUID REFERENCES public.kanban_classes_of_service(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_kanban_cards_class_of_service ON public.kanban_cards(class_of_service_id) WHERE is_deleted = FALSE AND class_of_service_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.kanban_classes_of_service ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_kanban_cos_all ON public.kanban_classes_of_service;
CREATE POLICY policy_kanban_cos_all ON public.kanban_classes_of_service
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards b
      WHERE b.id = board_id AND public.auth_user_can_access_project(b.project_id) AND COALESCE(b.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kanban_boards b
      WHERE b.id = board_id AND public.auth_user_can_access_project(b.project_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_classes_of_service TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('agile_releases', 'Agile release containers for roadmap and release burndown (v350)', FALSE, TRUE, 'agile'),
  ('release_stories', 'Links user stories to agile releases (v350)', FALSE, TRUE, 'agile'),
  ('kanban_classes_of_service', 'Kanban class-of-service definitions per board (v350)', FALSE, TRUE, 'agile')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
