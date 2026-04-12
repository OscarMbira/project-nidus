-- ============================================================================
-- v435: Agile gap (v350) — XP tables, Lean tables, Scrum of Scrums
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.xp_pair_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  navigator_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_pair_sessions_project ON public.xp_pair_sessions(project_id);

CREATE TABLE IF NOT EXISTS public.xp_code_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE SET NULL,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested')),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_code_reviews_project ON public.xp_code_reviews(project_id);

CREATE TABLE IF NOT EXISTS public.xp_ci_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  build_number VARCHAR(100),
  branch VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'passing' CHECK (status IN ('passing', 'failing', 'unstable', 'cancelled')),
  build_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  pipeline_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_ci_builds_project ON public.xp_ci_builds(project_id);

CREATE TABLE IF NOT EXISTS public.lean_value_stream_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  map_name VARCHAR(200) NOT NULL,
  map_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_lean_vsm_project ON public.lean_value_stream_maps(project_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.lean_kaizen_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  waste_type VARCHAR(50) NOT NULL DEFAULT 'waiting'
    CHECK (waste_type IN (
      'overproduction', 'waiting', 'transport', 'overprocessing', 'inventory',
      'motion', 'defects', 'unused_talent'
    )),
  description TEXT,
  impact VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
  status VARCHAR(30) NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified', 'in_progress', 'implemented', 'rejected')),
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_date DATE,
  implemented_at DATE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lean_kaizen_project ON public.lean_kaizen_items(project_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.scrum_of_scrums_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  facilitator_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_meetings_project ON public.scrum_of_scrums_meetings(project_id);

CREATE TABLE IF NOT EXISTS public.sos_team_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.scrum_of_scrums_meetings(id) ON DELETE CASCADE,
  team_name VARCHAR(200) NOT NULL,
  accomplished TEXT,
  planned TEXT,
  impediments TEXT,
  needs_coordination BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_updates_meeting ON public.sos_team_updates(meeting_id);

-- RLS
ALTER TABLE public.xp_pair_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_xp_pair_sessions_all ON public.xp_pair_sessions;
CREATE POLICY policy_xp_pair_sessions_all ON public.xp_pair_sessions
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

ALTER TABLE public.xp_code_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_xp_code_reviews_all ON public.xp_code_reviews;
CREATE POLICY policy_xp_code_reviews_all ON public.xp_code_reviews
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

ALTER TABLE public.xp_ci_builds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_xp_ci_builds_all ON public.xp_ci_builds;
CREATE POLICY policy_xp_ci_builds_all ON public.xp_ci_builds
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

ALTER TABLE public.lean_value_stream_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_lean_vsm_all ON public.lean_value_stream_maps;
CREATE POLICY policy_lean_vsm_all ON public.lean_value_stream_maps
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id) AND COALESCE(is_deleted, FALSE) = FALSE)
  WITH CHECK (public.auth_user_can_access_project(project_id));

ALTER TABLE public.lean_kaizen_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_lean_kaizen_all ON public.lean_kaizen_items;
CREATE POLICY policy_lean_kaizen_all ON public.lean_kaizen_items
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id) AND COALESCE(is_deleted, FALSE) = FALSE)
  WITH CHECK (public.auth_user_can_access_project(project_id));

ALTER TABLE public.scrum_of_scrums_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sos_meetings_all ON public.scrum_of_scrums_meetings;
CREATE POLICY policy_sos_meetings_all ON public.scrum_of_scrums_meetings
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

ALTER TABLE public.sos_team_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sos_updates_all ON public.sos_team_updates;
CREATE POLICY policy_sos_updates_all ON public.sos_team_updates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.scrum_of_scrums_meetings m
      WHERE m.id = meeting_id AND public.auth_user_can_access_project(m.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scrum_of_scrums_meetings m
      WHERE m.id = meeting_id AND public.auth_user_can_access_project(m.project_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_pair_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_code_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_ci_builds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lean_value_stream_maps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lean_kaizen_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrum_of_scrums_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sos_team_updates TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('xp_pair_sessions', 'XP pair programming session log (v350)', FALSE, TRUE, 'agile'),
  ('xp_code_reviews', 'XP code review records (v350)', FALSE, TRUE, 'agile'),
  ('xp_ci_builds', 'XP CI build history (v350)', FALSE, TRUE, 'agile'),
  ('lean_value_stream_maps', 'Lean value stream map JSON canvas (v350)', FALSE, TRUE, 'agile'),
  ('lean_kaizen_items', 'Lean Kaizen / waste tracking items (v350)', FALSE, TRUE, 'agile'),
  ('scrum_of_scrums_meetings', 'Scrum of Scrums meeting headers (v350)', FALSE, TRUE, 'agile'),
  ('sos_team_updates', 'Per-team Scrum of Scrums updates (v350)', FALSE, TRUE, 'agile')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
