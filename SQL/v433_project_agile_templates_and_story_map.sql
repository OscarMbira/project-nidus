-- ============================================================================
-- v433: Agile gap (v350) — project_agile_templates, story_map_items, user_stories columns
-- Prerequisites: projects, users, user_stories, auth_user_can_access_project
-- ============================================================================

-- DoR + TDD flags on user stories
ALTER TABLE public.user_stories
  ADD COLUMN IF NOT EXISTS definition_of_ready TEXT[],
  ADD COLUMN IF NOT EXISTS tdd_followed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_stories.definition_of_ready IS 'v350: Definition of Ready checklist (story level)';
COMMENT ON COLUMN public.user_stories.tdd_followed IS 'v350: XP — tests written before implementation';

CREATE TABLE IF NOT EXISTS public.project_agile_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_type VARCHAR(10) NOT NULL CHECK (template_type IN ('dod', 'dor')),
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  auto_apply_to_new_stories BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_agile_templates_proj_type
  ON public.project_agile_templates (project_id, template_type)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_project_agile_templates_project ON public.project_agile_templates(project_id) WHERE is_deleted = FALSE;

ALTER TABLE public.project_agile_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_project_agile_templates_all ON public.project_agile_templates;
CREATE POLICY policy_project_agile_templates_all ON public.project_agile_templates
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id) AND COALESCE(is_deleted, FALSE) = FALSE)
  WITH CHECK (public.auth_user_can_access_project(project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_agile_templates TO authenticated;

CREATE TABLE IF NOT EXISTS public.story_map_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('journey', 'activity', 'story')),
  parent_id UUID REFERENCES public.story_map_items(id) ON DELETE CASCADE,
  user_story_id UUID REFERENCES public.user_stories(id) ON DELETE SET NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT,
  col_order INTEGER NOT NULL DEFAULT 0,
  row_order INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_story_map_items_project ON public.story_map_items(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_story_map_items_parent ON public.story_map_items(parent_id) WHERE is_deleted = FALSE;

ALTER TABLE public.story_map_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_story_map_items_all ON public.story_map_items;
CREATE POLICY policy_story_map_items_all ON public.story_map_items
  FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id) AND COALESCE(is_deleted, FALSE) = FALSE)
  WITH CHECK (public.auth_user_can_access_project(project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_map_items TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('project_agile_templates', 'Project-level DoD/DoR template items (JSON) for Agile v350', FALSE, TRUE, 'agile'),
  ('story_map_items', 'User story map nodes (journey/activity/story) for Agile v350', FALSE, TRUE, 'agile')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
