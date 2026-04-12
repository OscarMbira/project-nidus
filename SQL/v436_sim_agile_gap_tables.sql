-- ============================================================================
-- v436: Agile gap (v350) — Simulator schema counterparts (sim.*)
-- Prerequisites: sim.practice_projects, v433–v435 applied on public (for reference patterns)
-- ============================================================================

-- Templates (mirror public.project_agile_templates)
CREATE TABLE IF NOT EXISTS sim.project_agile_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  template_type VARCHAR(10) NOT NULL CHECK (template_type IN ('dod', 'dor')),
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  auto_apply_to_new_stories BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_pat_proj_type
  ON sim.project_agile_templates (practice_project_id, template_type)
  WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS sim.story_map_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('journey', 'activity', 'story')),
  parent_id UUID REFERENCES sim.story_map_items(id) ON DELETE CASCADE,
  user_story_id UUID,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  col_order INTEGER NOT NULL DEFAULT 0,
  row_order INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.agile_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS sim.release_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES sim.agile_releases(id) ON DELETE CASCADE,
  user_story_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (release_id, user_story_id)
);

CREATE TABLE IF NOT EXISTS sim.kanban_classes_of_service (
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'kanban_cards' AND column_name = 'class_of_service_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'sim' AND table_name = 'kanban_cards') THEN
      ALTER TABLE sim.kanban_cards
        ADD COLUMN class_of_service_id UUID REFERENCES sim.kanban_classes_of_service(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Sim XP / Lean / SoS
CREATE TABLE IF NOT EXISTS sim.xp_pair_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  navigator_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  task_id UUID,
  user_story_id UUID,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.xp_code_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_story_id UUID,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'changes_requested')),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.xp_ci_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  build_number VARCHAR(100),
  branch VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'passing' CHECK (status IN ('passing', 'failing', 'unstable', 'cancelled')),
  build_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  pipeline_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.lean_value_stream_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  map_name VARCHAR(200) NOT NULL,
  map_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sim.lean_kaizen_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  waste_type VARCHAR(50) NOT NULL DEFAULT 'waiting',
  description TEXT,
  impact VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(30) NOT NULL DEFAULT 'identified',
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_date DATE,
  implemented_at DATE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.scrum_of_scrums_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  facilitator_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.sos_team_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES sim.scrum_of_scrums_meetings(id) ON DELETE CASCADE,
  team_name VARCHAR(200) NOT NULL,
  accomplished TEXT,
  planned TEXT,
  impediments TEXT,
  needs_coordination BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT ALL ON sim.project_agile_templates TO authenticated;
GRANT ALL ON sim.story_map_items TO authenticated;
GRANT ALL ON sim.agile_releases TO authenticated;
GRANT ALL ON sim.release_stories TO authenticated;
GRANT ALL ON sim.kanban_classes_of_service TO authenticated;
GRANT ALL ON sim.xp_pair_sessions TO authenticated;
GRANT ALL ON sim.xp_code_reviews TO authenticated;
GRANT ALL ON sim.xp_ci_builds TO authenticated;
GRANT ALL ON sim.lean_value_stream_maps TO authenticated;
GRANT ALL ON sim.lean_kaizen_items TO authenticated;
GRANT ALL ON sim.scrum_of_scrums_meetings TO authenticated;
GRANT ALL ON sim.sos_team_updates TO authenticated;

-- RLS (practice project owner / PMO — align with v421 style)
ALTER TABLE sim.project_agile_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_pat_all ON sim.project_agile_templates;
CREATE POLICY policy_sim_pat_all ON sim.project_agile_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
        AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user())
    )
  );

-- Repeat pattern for other sim.* tables (same project access)
ALTER TABLE sim.story_map_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_sim_story_map_all ON sim.story_map_items;
CREATE POLICY policy_sim_sim_story_map_all ON sim.story_map_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
      AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.agile_releases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_ar_all ON sim.agile_releases;
CREATE POLICY policy_sim_ar_all ON sim.agile_releases
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
      AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.release_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_rs_all ON sim.release_stories;
CREATE POLICY policy_sim_rs_all ON sim.release_stories
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.agile_releases r JOIN sim.practice_projects pp ON pp.id = r.practice_project_id
      WHERE r.id = release_id AND COALESCE(r.is_deleted, FALSE) = FALSE AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.agile_releases r JOIN sim.practice_projects pp ON pp.id = r.practice_project_id
      WHERE r.id = release_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.kanban_classes_of_service ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_kanban_cos_all ON sim.kanban_classes_of_service;
CREATE POLICY policy_sim_kanban_cos_all ON sim.kanban_classes_of_service
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.kanban_boards b WHERE b.id = board_id AND public.auth_user_can_access_project(b.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.kanban_boards b WHERE b.id = board_id AND public.auth_user_can_access_project(b.project_id)));

ALTER TABLE sim.xp_pair_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_xp_pair_all ON sim.xp_pair_sessions;
CREATE POLICY policy_sim_xp_pair_all ON sim.xp_pair_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.xp_code_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_xp_cr_all ON sim.xp_code_reviews;
CREATE POLICY policy_sim_xp_cr_all ON sim.xp_code_reviews
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.xp_ci_builds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_xp_ci_all ON sim.xp_ci_builds;
CREATE POLICY policy_sim_xp_ci_all ON sim.xp_ci_builds
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.lean_value_stream_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_lean_vsm_all ON sim.lean_value_stream_maps;
CREATE POLICY policy_sim_lean_vsm_all ON sim.lean_value_stream_maps
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
      AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.lean_kaizen_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_lean_k_all ON sim.lean_kaizen_items;
CREATE POLICY policy_sim_lean_k_all ON sim.lean_kaizen_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND COALESCE(pp.is_deleted, FALSE) = FALSE
      AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.scrum_of_scrums_meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_sos_m_all ON sim.scrum_of_scrums_meetings;
CREATE POLICY policy_sim_sos_m_all ON sim.scrum_of_scrums_meetings
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.practice_projects pp WHERE pp.id = practice_project_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

ALTER TABLE sim.sos_team_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_sim_sos_u_all ON sim.sos_team_updates;
CREATE POLICY policy_sim_sos_u_all ON sim.sos_team_updates
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sim.scrum_of_scrums_meetings m JOIN sim.practice_projects pp ON pp.id = m.practice_project_id
      WHERE m.id = meeting_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM sim.scrum_of_scrums_meetings m JOIN sim.practice_projects pp ON pp.id = m.practice_project_id
      WHERE m.id = meeting_id AND (pp.user_id = sim.get_current_user_id() OR public.is_pmo_admin_user()))
  );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('sim.project_agile_templates', 'Simulator: DoD/DoR templates for practice projects (v350)', FALSE, TRUE, 'agile'),
  ('sim.story_map_items', 'Simulator: story map nodes (v350)', FALSE, TRUE, 'agile'),
  ('sim.agile_releases', 'Simulator: agile releases (v350)', FALSE, TRUE, 'agile'),
  ('sim.release_stories', 'Simulator: release–story links (v350)', FALSE, TRUE, 'agile'),
  ('sim.kanban_classes_of_service', 'Simulator: Kanban class of service (v350)', FALSE, TRUE, 'agile'),
  ('sim.xp_pair_sessions', 'Simulator: XP pair sessions (v350)', FALSE, TRUE, 'agile'),
  ('sim.xp_code_reviews', 'Simulator: XP code reviews (v350)', FALSE, TRUE, 'agile'),
  ('sim.xp_ci_builds', 'Simulator: XP CI builds (v350)', FALSE, TRUE, 'agile'),
  ('sim.lean_value_stream_maps', 'Simulator: lean VSM (v350)', FALSE, TRUE, 'agile'),
  ('sim.lean_kaizen_items', 'Simulator: lean kaizen (v350)', FALSE, TRUE, 'agile'),
  ('sim.scrum_of_scrums_meetings', 'Simulator: SoS meetings (v350)', FALSE, TRUE, 'agile'),
  ('sim.sos_team_updates', 'Simulator: SoS team updates (v350)', FALSE, TRUE, 'agile')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
