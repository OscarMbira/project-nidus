-- v100: Modular documentation guides table
-- Stores the index (TOC) for all Platform and Simulator documentation guides.
-- Content (.md files) lives in Supabase Storage bucket "documentation/{system}/{module}/".

-- ============================================================
-- TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documentation_guides (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id    text        NOT NULL,                         -- URL slug, e.g. "wbs-builder-guide"
  title       text        NOT NULL,
  file_name   text        NOT NULL,                         -- e.g. "WBS_Builder_Guide.md"
  category    text        NOT NULL DEFAULT 'General',       -- sub-grouping within a module
  module      text        NOT NULL DEFAULT 'general',       -- matches module folder name, e.g. "planning-hub"
  system      text        NOT NULL CHECK (system IN ('platform', 'simulator')),
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, system)
);

-- Index for fast system + module lookups (primary query pattern)
CREATE INDEX IF NOT EXISTS idx_doc_guides_system_module
  ON public.documentation_guides (system, module, sort_order);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.documentation_guides ENABLE ROW LEVEL SECURITY;

-- Anyone can read active guides (docs are public)
CREATE POLICY "documentation_guides_public_read"
  ON public.documentation_guides
  FOR SELECT
  USING (is_active = true);

-- Only service_role can write (updates via Supabase Dashboard or admin API)
CREATE POLICY "documentation_guides_service_write"
  ON public.documentation_guides
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_documentation_guides_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documentation_guides_updated_at ON public.documentation_guides;
CREATE TRIGGER trg_documentation_guides_updated_at
  BEFORE UPDATE ON public.documentation_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_documentation_guides_updated_at();

-- ============================================================
-- SEED: 16 existing guides mapped to their modules
-- ============================================================

-- PLATFORM — general (cross-cutting guides)
INSERT INTO public.documentation_guides (guide_id, title, file_name, category, module, system, sort_order)
VALUES
  ('getting-started',         'Getting Started',                     'Platform_Getting_Started.md',    'Getting Started', 'general',             'platform', 10),
  ('project-manager-guide',   'Project Manager Guide',               'Project_Manager_Guide.md',       'Role Guides',     'general',             'platform', 20),
  ('team-lead-guide',         'Team Lead Guide',                     'Team_Lead_Guide.md',             'Role Guides',     'general',             'platform', 30),
  ('team-member-guide',       'Team Member Guide',                   'Team_Member_Guide.md',           'Role Guides',     'general',             'platform', 40),
  ('structured-pm-cs',        'Structured PM — Controlling a Stage', 'Structured_PM_CS_Guide.md',      'Methodologies',   'general',             'platform', 50),
  ('structured-pm-mp',        'Structured PM — Product Delivery',    'Structured_PM_MP_Guide.md',      'Methodologies',   'general',             'platform', 60)
ON CONFLICT (guide_id, system) DO UPDATE SET
  title      = EXCLUDED.title,
  file_name  = EXCLUDED.file_name,
  category   = EXCLUDED.category,
  module     = EXCLUDED.module,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- PLATFORM — planning-hub
INSERT INTO public.documentation_guides (guide_id, title, file_name, category, module, system, sort_order)
VALUES
  ('gantt-chart-guide',  'Gantt Chart Guide',    'Gantt_Chart_User_Guide.md',  'Planning Tools', 'planning-hub', 'platform', 10),
  ('kanban-guide',       'Kanban Board Guide',   'Kanban_User_Guide.md',       'Planning Tools', 'planning-hub', 'platform', 20),
  ('scrum-events',       'Scrum Events Guide',   'Scrum_Events_Guide.md',      'Agile',          'planning-hub', 'platform', 30),
  ('sprint-board',       'Sprint Board Guide',   'Sprint_Board_User_Guide.md', 'Agile',          'planning-hub', 'platform', 40)
ON CONFLICT (guide_id, system) DO UPDATE SET
  title      = EXCLUDED.title,
  file_name  = EXCLUDED.file_name,
  category   = EXCLUDED.category,
  module     = EXCLUDED.module,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- PLATFORM — risk-module
INSERT INTO public.documentation_guides (guide_id, title, file_name, category, module, system, sort_order)
VALUES
  ('risk-management', 'Risk Management Guide', 'Risk_Management_Guide.md', 'Risk', 'risk-module', 'platform', 10)
ON CONFLICT (guide_id, system) DO UPDATE SET
  title      = EXCLUDED.title,
  file_name  = EXCLUDED.file_name,
  category   = EXCLUDED.category,
  module     = EXCLUDED.module,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- PLATFORM — issues-module
INSERT INTO public.documentation_guides (guide_id, title, file_name, category, module, system, sort_order)
VALUES
  ('issue-management', 'Issue Management Guide', 'Issue_Management_Guide.md', 'Issues', 'issues-module', 'platform', 10),
  ('raid-log',         'RAID Log Guide',          'RAID_Log_User_Guide.md',    'Issues', 'issues-module', 'platform', 20)
ON CONFLICT (guide_id, system) DO UPDATE SET
  title      = EXCLUDED.title,
  file_name  = EXCLUDED.file_name,
  category   = EXCLUDED.category,
  module     = EXCLUDED.module,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- SIMULATOR — general
INSERT INTO public.documentation_guides (guide_id, title, file_name, category, module, system, sort_order)
VALUES
  ('getting-started',  'Getting Started',  'User_Guide.md',                            'Getting Started', 'general', 'simulator', 10),
  ('help-content',     'FAQ & Help',       'Help_Content.md',                          'Help',            'general', 'simulator', 20),
  ('scenario-guide',   'Scenario Guide',   'PRD_Project_Management_Simulator.md',      'Guides',          'general', 'simulator', 30)
ON CONFLICT (guide_id, system) DO UPDATE SET
  title      = EXCLUDED.title,
  file_name  = EXCLUDED.file_name,
  category   = EXCLUDED.category,
  module     = EXCLUDED.module,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ============================================================
-- REGISTER IN database_tables REGISTRY
-- ============================================================
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'documentation_guides',
  'Index (TOC) for all Platform and Simulator documentation guides. Content (.md files) stored in Supabase Storage bucket.',
  false,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = now();
