-- =============================================================================
-- v643_pmis_gap_tables_tier1.sql
-- PMIS Gap Analysis (v631) — Tier 1 tables: GAP-01 to GAP-05
-- Prerequisites: v31 (automation_rules, automation_executions), projects, accounts
-- No seed data.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_pmis_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── GAP-01: Workflow Automation (extends v31) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.automation_rule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code VARCHAR(80) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,
  rule_category VARCHAR(50) NOT NULL DEFAULT 'general',
  trigger_type VARCHAR(80) NOT NULL,
  action_type VARCHAR(80) NOT NULL,
  template_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  scope_level VARCHAR(30) NOT NULL DEFAULT 'project'
    CHECK (scope_level IN ('project', 'portfolio', 'system')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_automation_rule_templates_code UNIQUE (template_code)
);

CREATE INDEX IF NOT EXISTS idx_automation_rule_templates_category
  ON public.automation_rule_templates (rule_category) WHERE is_deleted = FALSE AND is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.automation_rule_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  parent_condition_id UUID REFERENCES public.automation_rule_conditions(id) ON DELETE CASCADE,
  logical_operator VARCHAR(10) NOT NULL DEFAULT 'AND'
    CHECK (logical_operator IN ('AND', 'OR')),
  field_name VARCHAR(120) NOT NULL,
  comparison_operator VARCHAR(30) NOT NULL DEFAULT 'equals',
  field_value JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_automation_rule_conditions_rule
  ON public.automation_rule_conditions (rule_id, sort_order) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.automation_rule_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  action_type VARCHAR(80) NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  delay_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_automation_rule_actions_rule
  ON public.automation_rule_actions (rule_id, sort_order) WHERE is_deleted = FALSE;

-- ── GAP-02: Global Search ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  keywords TEXT,
  breadcrumb TEXT,
  route_path TEXT,
  search_vector TSVECTOR,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_search_index_entity UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_search_index_account ON public.search_index (account_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_search_index_project ON public.search_index (project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_search_index_vector ON public.search_index USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS public.user_recent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT,
  route_path TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_recent_items UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_recent_items_user_visited
  ON public.user_recent_items (user_id, visited_at DESC);

CREATE TABLE IF NOT EXISTS public.user_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT,
  route_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_favourites UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favourites_user ON public.user_favourites (user_id, sort_order);

-- ── GAP-03: OKR / Goals ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.okr_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cycle_name VARCHAR(120) NOT NULL,
  cycle_code VARCHAR(40) NOT NULL,
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('quarter', 'half_year', 'full_year', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_okr_cycles_code UNIQUE (account_id, cycle_code)
);

CREATE TABLE IF NOT EXISTS public.okr_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  department_name VARCHAR(120) NOT NULL,
  department_code VARCHAR(40),
  parent_department_id UUID REFERENCES public.okr_departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.okr_cycles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.okr_departments(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES auth.users(id),
  objective_title VARCHAR(500) NOT NULL,
  objective_description TEXT,
  scope_level VARCHAR(30) NOT NULL DEFAULT 'organisation'
    CHECK (scope_level IN ('organisation', 'department', 'team')),
  health_status VARCHAR(20) NOT NULL DEFAULT 'on_track'
    CHECK (health_status IN ('on_track', 'at_risk', 'behind', 'completed')),
  progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_objectives_cycle ON public.objectives (cycle_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  kr_title VARCHAR(500) NOT NULL,
  kr_description TEXT,
  target_value NUMERIC(18,4),
  current_value NUMERIC(18,4) DEFAULT 0,
  baseline_value NUMERIC(18,4) DEFAULT 0,
  unit_label VARCHAR(60),
  health_status VARCHAR(20) NOT NULL DEFAULT 'on_track'
    CHECK (health_status IN ('on_track', 'at_risk', 'behind', 'completed')),
  progress_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.okr_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  programme_id UUID REFERENCES public.programmes(id) ON DELETE CASCADE,
  initiative_label VARCHAR(255),
  contribution_weight NUMERIC(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.okr_task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  contribution_pct NUMERIC(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_okr_task_links UNIQUE (key_result_id, task_id)
);

CREATE TABLE IF NOT EXISTS public.okr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_result_id UUID NOT NULL REFERENCES public.key_results(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_value NUMERIC(18,4),
  confidence_rating INTEGER CHECK (confidence_rating BETWEEN 1 AND 5),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── GAP-04: Custom Fields ────────────────────────────────────────────────────
-- Implemented by v515 Local Data Extensions (custom_field_groups, definitions,
-- options, values). Do NOT recreate those tables here — only add GAP-specific
-- visibility rules if missing.

CREATE TABLE IF NOT EXISTS public.custom_field_visibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  role_name VARCHAR(80) NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_custom_field_visibility UNIQUE (field_definition_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_custom_field_visibility_field
  ON public.custom_field_visibility_rules (field_definition_id) WHERE is_deleted = FALSE;

-- ── GAP-05: Workload Heatmap ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workload_capacity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hours_per_day NUMERIC(5,2) NOT NULL DEFAULT 8,
  hours_per_week NUMERIC(6,2) NOT NULL DEFAULT 40,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_workload_capacity_user
  ON public.workload_capacity_settings (user_id, project_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.workload_leave_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type VARCHAR(40) NOT NULL
    CHECK (leave_type IN ('annual_leave', 'public_holiday', 'sick_leave', 'training', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_workload_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_workload_leave_user_dates
  ON public.workload_leave_calendar (user_id, start_date, end_date) WHERE is_deleted = FALSE;

-- ── updated_at triggers ──────────────────────────────────────────────────────

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'automation_rule_templates', 'automation_rule_conditions', 'automation_rule_actions',
    'search_index', 'user_recent_items', 'user_favourites',
    'okr_cycles', 'okr_departments', 'objectives', 'key_results', 'okr_initiatives',
    'okr_task_links', 'okr_checkins',
    'custom_field_visibility_rules',
    'workload_capacity_settings', 'workload_leave_calendar'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_pmis_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- Search vector maintenance
CREATE OR REPLACE FUNCTION public.search_index_sync_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.keywords, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_search_index_vector ON public.search_index;
CREATE TRIGGER trg_search_index_vector
  BEFORE INSERT OR UPDATE OF title, keywords ON public.search_index
  FOR EACH ROW EXECUTE FUNCTION public.search_index_sync_vector();

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.automation_rule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rule_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rule_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recent_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_visibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload_capacity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workload_leave_calendar ENABLE ROW LEVEL SECURITY;

-- PMO admin: org-wide tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'automation_rule_templates', 'okr_cycles', 'okr_departments', 'objectives',
    'custom_field_visibility_rules', 'workload_capacity_settings', 'workload_leave_calendar'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS policy_%s_pmo ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY policy_%s_pmo ON public.%I FOR ALL TO authenticated USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()))',
      tbl, tbl
    );
  END LOOP;
END $$;

-- User-owned
DROP POLICY IF EXISTS policy_user_recent_items_own ON public.user_recent_items;
CREATE POLICY policy_user_recent_items_own ON public.user_recent_items
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS policy_user_favourites_own ON public.user_favourites;
CREATE POLICY policy_user_favourites_own ON public.user_favourites
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Rule children: project members via parent rule
DROP POLICY IF EXISTS policy_automation_rule_conditions_member ON public.automation_rule_conditions;
CREATE POLICY policy_automation_rule_conditions_member ON public.automation_rule_conditions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.automation_rules ar
      LEFT JOIN public.user_projects up ON up.project_id = ar.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
      WHERE ar.id = automation_rule_conditions.rule_id
        AND (ar.project_id IS NULL AND public.is_user_pmo_admin(auth.uid()) OR up.id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS policy_automation_rule_actions_member ON public.automation_rule_actions;
CREATE POLICY policy_automation_rule_actions_member ON public.automation_rule_actions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.automation_rules ar
      LEFT JOIN public.user_projects up ON up.project_id = ar.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
      WHERE ar.id = automation_rule_actions.rule_id
        AND (ar.project_id IS NULL AND public.is_user_pmo_admin(auth.uid()) OR up.id IS NOT NULL)
    )
  );

-- Search index: authenticated read; writes via service/PMO
DROP POLICY IF EXISTS policy_search_index_select ON public.search_index;
CREATE POLICY policy_search_index_select ON public.search_index
  FOR SELECT TO authenticated USING (is_deleted = FALSE);

DROP POLICY IF EXISTS policy_search_index_pmo_write ON public.search_index;
CREATE POLICY policy_search_index_pmo_write ON public.search_index
  FOR ALL TO authenticated USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- OKR child tables via objective account
DROP POLICY IF EXISTS policy_key_results_via_objective ON public.key_results;
CREATE POLICY policy_key_results_via_objective ON public.key_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.objectives o WHERE o.id = key_results.objective_id AND (public.is_user_pmo_admin(auth.uid()) OR o.is_deleted = FALSE)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.objectives o WHERE o.id = key_results.objective_id));

DROP POLICY IF EXISTS policy_okr_initiatives_member ON public.okr_initiatives;
CREATE POLICY policy_okr_initiatives_member ON public.okr_initiatives FOR ALL TO authenticated
  USING (
    project_id IS NULL OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = okr_initiatives.project_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE)
  );

DROP POLICY IF EXISTS policy_okr_task_links_member ON public.okr_task_links;
CREATE POLICY policy_okr_task_links_member ON public.okr_task_links FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

DROP POLICY IF EXISTS policy_okr_checkins_member ON public.okr_checkins;
CREATE POLICY policy_okr_checkins_member ON public.okr_checkins FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

-- GAP-04 values: use v515 custom_field_values + custom_field_permissions for RLS

-- Workload: own leave + capacity
DROP POLICY IF EXISTS policy_workload_leave_own ON public.workload_leave_calendar;
CREATE POLICY policy_workload_leave_own ON public.workload_leave_calendar FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_workload_capacity_own ON public.workload_capacity_settings;
CREATE POLICY policy_workload_capacity_own ON public.workload_capacity_settings FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- ── database_tables registry ─────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('automation_rule_templates', 'Pre-built workflow automation rule templates (GAP-01)', false, true),
  ('automation_rule_conditions', 'Multi-condition chains per automation rule (GAP-01)', false, true),
  ('automation_rule_actions', 'Action steps per automation rule (GAP-01)', false, true),
  ('search_index', 'Denormalized global search index (GAP-02)', false, true),
  ('user_recent_items', 'Per-user recently viewed entities (GAP-02)', false, true),
  ('user_favourites', 'Per-user pinned favourite entities (GAP-02)', false, true),
  ('okr_cycles', 'OKR time periods e.g. Q1 FY2026 (GAP-03)', false, true),
  ('okr_departments', 'Department groupings for OKRs (GAP-03)', false, true),
  ('objectives', 'OKR objectives per cycle (GAP-03)', false, true),
  ('key_results', 'Measurable key results per objective (GAP-03)', false, true),
  ('okr_initiatives', 'Projects/programmes linked to key results (GAP-03)', false, true),
  ('okr_task_links', 'Tasks contributing to key result progress (GAP-03)', false, true),
  ('okr_checkins', 'OKR progress check-in entries (GAP-03)', false, true),
  ('custom_field_visibility_rules', 'Role-based custom field visibility (GAP-04; extends v515 LDE)', false, true),
  ('workload_capacity_settings', 'Per-member daily/weekly capacity hours (GAP-05)', false, true),
  ('workload_leave_calendar', 'Leave and holiday calendar for workload view (GAP-05)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v643_pmis_gap_tables_tier1.sql completed'; END $$;
