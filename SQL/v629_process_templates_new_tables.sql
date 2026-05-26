-- v629: Process Templates — new PMBOK template tables (Platform public + Simulator sim)
-- Date: 2026-05-26
-- Registers all tables in database_tables registry

-- ── Platform (public schema) ───────────────────────────────────────────────

-- PMBOK Project Charter templates
CREATE TABLE IF NOT EXISTS public.project_charters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_charters_project ON public.project_charters(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_project_charters_status ON public.project_charters(status) WHERE is_deleted = false;

ALTER TABLE public.project_charters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_charters_select" ON public.project_charters;
CREATE POLICY "project_charters_select" ON public.project_charters FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_charters.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_charters_insert" ON public.project_charters;
CREATE POLICY "project_charters_insert" ON public.project_charters FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_charters.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_charters_update" ON public.project_charters;
CREATE POLICY "project_charters_update" ON public.project_charters FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_charters.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_charters_delete" ON public.project_charters;
CREATE POLICY "project_charters_delete" ON public.project_charters FOR DELETE USING (created_by = auth.uid());

-- Assumption log templates
CREATE TABLE IF NOT EXISTS public.assumption_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_assumption_logs_project ON public.assumption_logs(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_assumption_logs_status ON public.assumption_logs(status) WHERE is_deleted = false;

ALTER TABLE public.assumption_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assumption_logs_select" ON public.assumption_logs;
CREATE POLICY "assumption_logs_select" ON public.assumption_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.assumption_logs.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "assumption_logs_insert" ON public.assumption_logs;
CREATE POLICY "assumption_logs_insert" ON public.assumption_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.assumption_logs.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "assumption_logs_update" ON public.assumption_logs;
CREATE POLICY "assumption_logs_update" ON public.assumption_logs FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.assumption_logs.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "assumption_logs_delete" ON public.assumption_logs;
CREATE POLICY "assumption_logs_delete" ON public.assumption_logs FOR DELETE USING (created_by = auth.uid());

-- Project Management Plan templates
CREATE TABLE IF NOT EXISTS public.project_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_management_plans_project ON public.project_management_plans(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_project_management_plans_status ON public.project_management_plans(status) WHERE is_deleted = false;

ALTER TABLE public.project_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_management_plans_select" ON public.project_management_plans;
CREATE POLICY "project_management_plans_select" ON public.project_management_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_management_plans_insert" ON public.project_management_plans;
CREATE POLICY "project_management_plans_insert" ON public.project_management_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_management_plans_update" ON public.project_management_plans;
CREATE POLICY "project_management_plans_update" ON public.project_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_management_plans_delete" ON public.project_management_plans;
CREATE POLICY "project_management_plans_delete" ON public.project_management_plans FOR DELETE USING (created_by = auth.uid());

-- Requirements Management Plan templates
CREATE TABLE IF NOT EXISTS public.requirements_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_requirements_management_plans_project ON public.requirements_management_plans(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_requirements_management_plans_status ON public.requirements_management_plans(status) WHERE is_deleted = false;

ALTER TABLE public.requirements_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirements_management_plans_select" ON public.requirements_management_plans;
CREATE POLICY "requirements_management_plans_select" ON public.requirements_management_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.requirements_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "requirements_management_plans_insert" ON public.requirements_management_plans;
CREATE POLICY "requirements_management_plans_insert" ON public.requirements_management_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.requirements_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "requirements_management_plans_update" ON public.requirements_management_plans;
CREATE POLICY "requirements_management_plans_update" ON public.requirements_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.requirements_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "requirements_management_plans_delete" ON public.requirements_management_plans;
CREATE POLICY "requirements_management_plans_delete" ON public.requirements_management_plans FOR DELETE USING (created_by = auth.uid());

-- Requirements documentation templates
CREATE TABLE IF NOT EXISTS public.requirements_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_requirements_documentation_project ON public.requirements_documentation(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_requirements_documentation_status ON public.requirements_documentation(status) WHERE is_deleted = false;

ALTER TABLE public.requirements_documentation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirements_documentation_select" ON public.requirements_documentation;
CREATE POLICY "requirements_documentation_select" ON public.requirements_documentation FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.requirements_documentation.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "requirements_documentation_insert" ON public.requirements_documentation;
CREATE POLICY "requirements_documentation_insert" ON public.requirements_documentation FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.requirements_documentation.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "requirements_documentation_update" ON public.requirements_documentation;
CREATE POLICY "requirements_documentation_update" ON public.requirements_documentation FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.requirements_documentation.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "requirements_documentation_delete" ON public.requirements_documentation;
CREATE POLICY "requirements_documentation_delete" ON public.requirements_documentation FOR DELETE USING (created_by = auth.uid());

-- WBS dictionary entries linked to WBS nodes
CREATE TABLE IF NOT EXISTS public.wbs_dictionary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  wbs_node_id uuid
);

CREATE INDEX IF NOT EXISTS idx_wbs_dictionary_entries_project ON public.wbs_dictionary_entries(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wbs_dictionary_entries_status ON public.wbs_dictionary_entries(status) WHERE is_deleted = false;

ALTER TABLE public.wbs_dictionary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wbs_dictionary_entries_select" ON public.wbs_dictionary_entries;
CREATE POLICY "wbs_dictionary_entries_select" ON public.wbs_dictionary_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.wbs_dictionary_entries.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "wbs_dictionary_entries_insert" ON public.wbs_dictionary_entries;
CREATE POLICY "wbs_dictionary_entries_insert" ON public.wbs_dictionary_entries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.wbs_dictionary_entries.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "wbs_dictionary_entries_update" ON public.wbs_dictionary_entries;
CREATE POLICY "wbs_dictionary_entries_update" ON public.wbs_dictionary_entries FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.wbs_dictionary_entries.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "wbs_dictionary_entries_delete" ON public.wbs_dictionary_entries;
CREATE POLICY "wbs_dictionary_entries_delete" ON public.wbs_dictionary_entries FOR DELETE USING (created_by = auth.uid());

-- Activity attributes linked to activity list
CREATE TABLE IF NOT EXISTS public.activity_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  activity_id uuid
);

CREATE INDEX IF NOT EXISTS idx_activity_attributes_project ON public.activity_attributes(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_attributes_status ON public.activity_attributes(status) WHERE is_deleted = false;

ALTER TABLE public.activity_attributes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_attributes_select" ON public.activity_attributes;
CREATE POLICY "activity_attributes_select" ON public.activity_attributes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_attributes.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_attributes_insert" ON public.activity_attributes;
CREATE POLICY "activity_attributes_insert" ON public.activity_attributes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_attributes.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_attributes_update" ON public.activity_attributes;
CREATE POLICY "activity_attributes_update" ON public.activity_attributes FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_attributes.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_attributes_delete" ON public.activity_attributes;
CREATE POLICY "activity_attributes_delete" ON public.activity_attributes FOR DELETE USING (created_by = auth.uid());

-- Activity resource requirements
CREATE TABLE IF NOT EXISTS public.activity_resource_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  activity_id uuid
);

CREATE INDEX IF NOT EXISTS idx_activity_resource_requirements_project ON public.activity_resource_requirements(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_resource_requirements_status ON public.activity_resource_requirements(status) WHERE is_deleted = false;

ALTER TABLE public.activity_resource_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_resource_requirements_select" ON public.activity_resource_requirements;
CREATE POLICY "activity_resource_requirements_select" ON public.activity_resource_requirements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_resource_requirements.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_resource_requirements_insert" ON public.activity_resource_requirements;
CREATE POLICY "activity_resource_requirements_insert" ON public.activity_resource_requirements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_resource_requirements.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_resource_requirements_update" ON public.activity_resource_requirements;
CREATE POLICY "activity_resource_requirements_update" ON public.activity_resource_requirements FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_resource_requirements.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_resource_requirements_delete" ON public.activity_resource_requirements;
CREATE POLICY "activity_resource_requirements_delete" ON public.activity_resource_requirements FOR DELETE USING (created_by = auth.uid());

-- Resource Breakdown Structure templates
CREATE TABLE IF NOT EXISTS public.resource_breakdown_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_resource_breakdown_structure_project ON public.resource_breakdown_structure(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_breakdown_structure_status ON public.resource_breakdown_structure(status) WHERE is_deleted = false;

ALTER TABLE public.resource_breakdown_structure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_breakdown_structure_select" ON public.resource_breakdown_structure;
CREATE POLICY "resource_breakdown_structure_select" ON public.resource_breakdown_structure FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.resource_breakdown_structure.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "resource_breakdown_structure_insert" ON public.resource_breakdown_structure;
CREATE POLICY "resource_breakdown_structure_insert" ON public.resource_breakdown_structure FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.resource_breakdown_structure.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "resource_breakdown_structure_update" ON public.resource_breakdown_structure;
CREATE POLICY "resource_breakdown_structure_update" ON public.resource_breakdown_structure FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.resource_breakdown_structure.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "resource_breakdown_structure_delete" ON public.resource_breakdown_structure;
CREATE POLICY "resource_breakdown_structure_delete" ON public.resource_breakdown_structure FOR DELETE USING (created_by = auth.uid());

-- Activity duration estimates
CREATE TABLE IF NOT EXISTS public.activity_duration_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  activity_id uuid
);

CREATE INDEX IF NOT EXISTS idx_activity_duration_estimates_project ON public.activity_duration_estimates(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_duration_estimates_status ON public.activity_duration_estimates(status) WHERE is_deleted = false;

ALTER TABLE public.activity_duration_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_duration_estimates_select" ON public.activity_duration_estimates;
CREATE POLICY "activity_duration_estimates_select" ON public.activity_duration_estimates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_duration_estimates.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_duration_estimates_insert" ON public.activity_duration_estimates;
CREATE POLICY "activity_duration_estimates_insert" ON public.activity_duration_estimates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_duration_estimates.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_duration_estimates_update" ON public.activity_duration_estimates;
CREATE POLICY "activity_duration_estimates_update" ON public.activity_duration_estimates FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_duration_estimates.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_duration_estimates_delete" ON public.activity_duration_estimates;
CREATE POLICY "activity_duration_estimates_delete" ON public.activity_duration_estimates FOR DELETE USING (created_by = auth.uid());

-- Cost Management Plan templates
CREATE TABLE IF NOT EXISTS public.cost_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cost_management_plans_project ON public.cost_management_plans(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_cost_management_plans_status ON public.cost_management_plans(status) WHERE is_deleted = false;

ALTER TABLE public.cost_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_management_plans_select" ON public.cost_management_plans;
CREATE POLICY "cost_management_plans_select" ON public.cost_management_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.cost_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "cost_management_plans_insert" ON public.cost_management_plans;
CREATE POLICY "cost_management_plans_insert" ON public.cost_management_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.cost_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "cost_management_plans_update" ON public.cost_management_plans;
CREATE POLICY "cost_management_plans_update" ON public.cost_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.cost_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "cost_management_plans_delete" ON public.cost_management_plans;
CREATE POLICY "cost_management_plans_delete" ON public.cost_management_plans FOR DELETE USING (created_by = auth.uid());

-- Activity cost estimates
CREATE TABLE IF NOT EXISTS public.activity_cost_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  activity_id uuid
);

CREATE INDEX IF NOT EXISTS idx_activity_cost_estimates_project ON public.activity_cost_estimates(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_cost_estimates_status ON public.activity_cost_estimates(status) WHERE is_deleted = false;

ALTER TABLE public.activity_cost_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_cost_estimates_select" ON public.activity_cost_estimates;
CREATE POLICY "activity_cost_estimates_select" ON public.activity_cost_estimates FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_cost_estimates.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_cost_estimates_insert" ON public.activity_cost_estimates;
CREATE POLICY "activity_cost_estimates_insert" ON public.activity_cost_estimates FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_cost_estimates.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_cost_estimates_update" ON public.activity_cost_estimates;
CREATE POLICY "activity_cost_estimates_update" ON public.activity_cost_estimates FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.activity_cost_estimates.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "activity_cost_estimates_delete" ON public.activity_cost_estimates;
CREATE POLICY "activity_cost_estimates_delete" ON public.activity_cost_estimates FOR DELETE USING (created_by = auth.uid());

-- Cost baseline templates
CREATE TABLE IF NOT EXISTS public.cost_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cost_baselines_project ON public.cost_baselines(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_cost_baselines_status ON public.cost_baselines(status) WHERE is_deleted = false;

ALTER TABLE public.cost_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_baselines_select" ON public.cost_baselines;
CREATE POLICY "cost_baselines_select" ON public.cost_baselines FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.cost_baselines.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "cost_baselines_insert" ON public.cost_baselines;
CREATE POLICY "cost_baselines_insert" ON public.cost_baselines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.cost_baselines.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "cost_baselines_update" ON public.cost_baselines;
CREATE POLICY "cost_baselines_update" ON public.cost_baselines FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.cost_baselines.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "cost_baselines_delete" ON public.cost_baselines;
CREATE POLICY "cost_baselines_delete" ON public.cost_baselines FOR DELETE USING (created_by = auth.uid());

-- Resource Management Plan templates
CREATE TABLE IF NOT EXISTS public.resource_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_resource_management_plans_project ON public.resource_management_plans(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_management_plans_status ON public.resource_management_plans(status) WHERE is_deleted = false;

ALTER TABLE public.resource_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_management_plans_select" ON public.resource_management_plans;
CREATE POLICY "resource_management_plans_select" ON public.resource_management_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.resource_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "resource_management_plans_insert" ON public.resource_management_plans;
CREATE POLICY "resource_management_plans_insert" ON public.resource_management_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.resource_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "resource_management_plans_update" ON public.resource_management_plans;
CREATE POLICY "resource_management_plans_update" ON public.resource_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.resource_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "resource_management_plans_delete" ON public.resource_management_plans;
CREATE POLICY "resource_management_plans_delete" ON public.resource_management_plans FOR DELETE USING (created_by = auth.uid());

-- Stakeholder Engagement Plan templates
CREATE TABLE IF NOT EXISTS public.stakeholder_engagement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_plans_project ON public.stakeholder_engagement_plans(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_plans_status ON public.stakeholder_engagement_plans(status) WHERE is_deleted = false;

ALTER TABLE public.stakeholder_engagement_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stakeholder_engagement_plans_select" ON public.stakeholder_engagement_plans;
CREATE POLICY "stakeholder_engagement_plans_select" ON public.stakeholder_engagement_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.stakeholder_engagement_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "stakeholder_engagement_plans_insert" ON public.stakeholder_engagement_plans;
CREATE POLICY "stakeholder_engagement_plans_insert" ON public.stakeholder_engagement_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.stakeholder_engagement_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "stakeholder_engagement_plans_update" ON public.stakeholder_engagement_plans;
CREATE POLICY "stakeholder_engagement_plans_update" ON public.stakeholder_engagement_plans FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.stakeholder_engagement_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "stakeholder_engagement_plans_delete" ON public.stakeholder_engagement_plans;
CREATE POLICY "stakeholder_engagement_plans_delete" ON public.stakeholder_engagement_plans FOR DELETE USING (created_by = auth.uid());

-- Procurement Management Plan templates
CREATE TABLE IF NOT EXISTS public.procurement_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_procurement_management_plans_project ON public.procurement_management_plans(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_procurement_management_plans_status ON public.procurement_management_plans(status) WHERE is_deleted = false;

ALTER TABLE public.procurement_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "procurement_management_plans_select" ON public.procurement_management_plans;
CREATE POLICY "procurement_management_plans_select" ON public.procurement_management_plans FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.procurement_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "procurement_management_plans_insert" ON public.procurement_management_plans;
CREATE POLICY "procurement_management_plans_insert" ON public.procurement_management_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.procurement_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "procurement_management_plans_update" ON public.procurement_management_plans;
CREATE POLICY "procurement_management_plans_update" ON public.procurement_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.procurement_management_plans.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "procurement_management_plans_delete" ON public.procurement_management_plans;
CREATE POLICY "procurement_management_plans_delete" ON public.procurement_management_plans FOR DELETE USING (created_by = auth.uid());

-- Quality checklist headers
CREATE TABLE IF NOT EXISTS public.quality_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_quality_checklists_project ON public.quality_checklists(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_checklists_status ON public.quality_checklists(status) WHERE is_deleted = false;

ALTER TABLE public.quality_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quality_checklists_select" ON public.quality_checklists;
CREATE POLICY "quality_checklists_select" ON public.quality_checklists FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.quality_checklists.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "quality_checklists_insert" ON public.quality_checklists;
CREATE POLICY "quality_checklists_insert" ON public.quality_checklists FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.quality_checklists.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "quality_checklists_update" ON public.quality_checklists;
CREATE POLICY "quality_checklists_update" ON public.quality_checklists FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.quality_checklists.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "quality_checklists_delete" ON public.quality_checklists;
CREATE POLICY "quality_checklists_delete" ON public.quality_checklists FOR DELETE USING (created_by = auth.uid());

-- Team performance assessment templates
CREATE TABLE IF NOT EXISTS public.team_performance_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_team_performance_assessments_project ON public.team_performance_assessments(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_team_performance_assessments_status ON public.team_performance_assessments(status) WHERE is_deleted = false;

ALTER TABLE public.team_performance_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_performance_assessments_select" ON public.team_performance_assessments;
CREATE POLICY "team_performance_assessments_select" ON public.team_performance_assessments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.team_performance_assessments.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "team_performance_assessments_insert" ON public.team_performance_assessments;
CREATE POLICY "team_performance_assessments_insert" ON public.team_performance_assessments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.team_performance_assessments.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "team_performance_assessments_update" ON public.team_performance_assessments;
CREATE POLICY "team_performance_assessments_update" ON public.team_performance_assessments FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.team_performance_assessments.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "team_performance_assessments_delete" ON public.team_performance_assessments;
CREATE POLICY "team_performance_assessments_delete" ON public.team_performance_assessments FOR DELETE USING (created_by = auth.uid());

-- Make-or-buy decision log entries
CREATE TABLE IF NOT EXISTS public.make_or_buy_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_make_or_buy_decisions_project ON public.make_or_buy_decisions(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_make_or_buy_decisions_status ON public.make_or_buy_decisions(status) WHERE is_deleted = false;

ALTER TABLE public.make_or_buy_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "make_or_buy_decisions_select" ON public.make_or_buy_decisions;
CREATE POLICY "make_or_buy_decisions_select" ON public.make_or_buy_decisions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.make_or_buy_decisions.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "make_or_buy_decisions_insert" ON public.make_or_buy_decisions;
CREATE POLICY "make_or_buy_decisions_insert" ON public.make_or_buy_decisions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.make_or_buy_decisions.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "make_or_buy_decisions_update" ON public.make_or_buy_decisions;
CREATE POLICY "make_or_buy_decisions_update" ON public.make_or_buy_decisions FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.make_or_buy_decisions.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "make_or_buy_decisions_delete" ON public.make_or_buy_decisions;
CREATE POLICY "make_or_buy_decisions_delete" ON public.make_or_buy_decisions FOR DELETE USING (created_by = auth.uid());

-- Variance analysis report templates
CREATE TABLE IF NOT EXISTS public.variance_analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_variance_analysis_reports_project ON public.variance_analysis_reports(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_variance_analysis_reports_status ON public.variance_analysis_reports(status) WHERE is_deleted = false;

ALTER TABLE public.variance_analysis_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variance_analysis_reports_select" ON public.variance_analysis_reports;
CREATE POLICY "variance_analysis_reports_select" ON public.variance_analysis_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.variance_analysis_reports.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "variance_analysis_reports_insert" ON public.variance_analysis_reports;
CREATE POLICY "variance_analysis_reports_insert" ON public.variance_analysis_reports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.variance_analysis_reports.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "variance_analysis_reports_update" ON public.variance_analysis_reports;
CREATE POLICY "variance_analysis_reports_update" ON public.variance_analysis_reports FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.variance_analysis_reports.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "variance_analysis_reports_delete" ON public.variance_analysis_reports;
CREATE POLICY "variance_analysis_reports_delete" ON public.variance_analysis_reports FOR DELETE USING (created_by = auth.uid());

-- Earned value status report templates
CREATE TABLE IF NOT EXISTS public.evm_status_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_evm_status_reports_project ON public.evm_status_reports(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_evm_status_reports_status ON public.evm_status_reports(status) WHERE is_deleted = false;

ALTER TABLE public.evm_status_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evm_status_reports_select" ON public.evm_status_reports;
CREATE POLICY "evm_status_reports_select" ON public.evm_status_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.evm_status_reports.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "evm_status_reports_insert" ON public.evm_status_reports;
CREATE POLICY "evm_status_reports_insert" ON public.evm_status_reports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.evm_status_reports.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "evm_status_reports_update" ON public.evm_status_reports;
CREATE POLICY "evm_status_reports_update" ON public.evm_status_reports FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.evm_status_reports.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "evm_status_reports_delete" ON public.evm_status_reports;
CREATE POLICY "evm_status_reports_delete" ON public.evm_status_reports FOR DELETE USING (created_by = auth.uid());

-- Scope validation and deliverable acceptance forms
CREATE TABLE IF NOT EXISTS public.scope_acceptance_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_scope_acceptance_forms_project ON public.scope_acceptance_forms(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_scope_acceptance_forms_status ON public.scope_acceptance_forms(status) WHERE is_deleted = false;

ALTER TABLE public.scope_acceptance_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scope_acceptance_forms_select" ON public.scope_acceptance_forms;
CREATE POLICY "scope_acceptance_forms_select" ON public.scope_acceptance_forms FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.scope_acceptance_forms.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "scope_acceptance_forms_insert" ON public.scope_acceptance_forms;
CREATE POLICY "scope_acceptance_forms_insert" ON public.scope_acceptance_forms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.scope_acceptance_forms.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "scope_acceptance_forms_update" ON public.scope_acceptance_forms;
CREATE POLICY "scope_acceptance_forms_update" ON public.scope_acceptance_forms FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.scope_acceptance_forms.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "scope_acceptance_forms_delete" ON public.scope_acceptance_forms;
CREATE POLICY "scope_acceptance_forms_delete" ON public.scope_acceptance_forms FOR DELETE USING (created_by = auth.uid());

-- Project closure checklist headers
CREATE TABLE IF NOT EXISTS public.project_closure_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_closure_checklists_project ON public.project_closure_checklists(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_project_closure_checklists_status ON public.project_closure_checklists(status) WHERE is_deleted = false;

ALTER TABLE public.project_closure_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_closure_checklists_select" ON public.project_closure_checklists;
CREATE POLICY "project_closure_checklists_select" ON public.project_closure_checklists FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_closure_checklists.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_closure_checklists_insert" ON public.project_closure_checklists;
CREATE POLICY "project_closure_checklists_insert" ON public.project_closure_checklists FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_closure_checklists.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_closure_checklists_update" ON public.project_closure_checklists;
CREATE POLICY "project_closure_checklists_update" ON public.project_closure_checklists FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.project_closure_checklists.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "project_closure_checklists_delete" ON public.project_closure_checklists;
CREATE POLICY "project_closure_checklists_delete" ON public.project_closure_checklists FOR DELETE USING (created_by = auth.uid());

-- Contract closure document templates
CREATE TABLE IF NOT EXISTS public.contract_closure_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_contract_closure_documents_project ON public.contract_closure_documents(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contract_closure_documents_status ON public.contract_closure_documents(status) WHERE is_deleted = false;

ALTER TABLE public.contract_closure_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_closure_documents_select" ON public.contract_closure_documents;
CREATE POLICY "contract_closure_documents_select" ON public.contract_closure_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.contract_closure_documents.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "contract_closure_documents_insert" ON public.contract_closure_documents;
CREATE POLICY "contract_closure_documents_insert" ON public.contract_closure_documents FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.contract_closure_documents.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "contract_closure_documents_update" ON public.contract_closure_documents;
CREATE POLICY "contract_closure_documents_update" ON public.contract_closure_documents FOR UPDATE USING (
  created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = public.contract_closure_documents.project_id AND up.user_id = auth.uid() AND up.is_deleted = false)
);

DROP POLICY IF EXISTS "contract_closure_documents_delete" ON public.contract_closure_documents;
CREATE POLICY "contract_closure_documents_delete" ON public.contract_closure_documents FOR DELETE USING (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS public.quality_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.quality_checklists(id) ON DELETE CASCADE,
  item_order integer NOT NULL DEFAULT 1,
  item_text text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE public.quality_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quality_checklist_items_all" ON public.quality_checklist_items;
CREATE POLICY "quality_checklist_items_all" ON public.quality_checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.quality_checklists p WHERE p.id = public.quality_checklist_items.checklist_id)
);

CREATE TABLE IF NOT EXISTS public.project_closure_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.project_closure_checklists(id) ON DELETE CASCADE,
  item_order integer NOT NULL DEFAULT 1,
  item_text text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE public.project_closure_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_closure_checklist_items_all" ON public.project_closure_checklist_items;
CREATE POLICY "project_closure_checklist_items_all" ON public.project_closure_checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.project_closure_checklists p WHERE p.id = public.project_closure_checklist_items.checklist_id)
);

-- ── Simulator (sim schema) ───────────────────────────────────────────────

-- PMBOK Project Charter templates
CREATE TABLE IF NOT EXISTS sim.project_charters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_charters_project ON sim.project_charters(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_project_charters_status ON sim.project_charters(status) WHERE is_deleted = false;

ALTER TABLE sim.project_charters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_charters_select" ON sim.project_charters;
CREATE POLICY "project_charters_select" ON sim.project_charters FOR SELECT USING (
  sim.project_charters.created_by = auth.uid() OR sim.project_charters.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_charters_insert" ON sim.project_charters;
CREATE POLICY "project_charters_insert" ON sim.project_charters FOR INSERT WITH CHECK (
  sim.project_charters.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_charters_update" ON sim.project_charters;
CREATE POLICY "project_charters_update" ON sim.project_charters FOR UPDATE USING (
  created_by = auth.uid() OR sim.project_charters.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_charters_delete" ON sim.project_charters;
CREATE POLICY "project_charters_delete" ON sim.project_charters FOR DELETE USING (created_by = auth.uid());

-- Assumption log templates
CREATE TABLE IF NOT EXISTS sim.assumption_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_assumption_logs_project ON sim.assumption_logs(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_assumption_logs_status ON sim.assumption_logs(status) WHERE is_deleted = false;

ALTER TABLE sim.assumption_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assumption_logs_select" ON sim.assumption_logs;
CREATE POLICY "assumption_logs_select" ON sim.assumption_logs FOR SELECT USING (
  sim.assumption_logs.created_by = auth.uid() OR sim.assumption_logs.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "assumption_logs_insert" ON sim.assumption_logs;
CREATE POLICY "assumption_logs_insert" ON sim.assumption_logs FOR INSERT WITH CHECK (
  sim.assumption_logs.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "assumption_logs_update" ON sim.assumption_logs;
CREATE POLICY "assumption_logs_update" ON sim.assumption_logs FOR UPDATE USING (
  created_by = auth.uid() OR sim.assumption_logs.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "assumption_logs_delete" ON sim.assumption_logs;
CREATE POLICY "assumption_logs_delete" ON sim.assumption_logs FOR DELETE USING (created_by = auth.uid());

-- Project Management Plan templates
CREATE TABLE IF NOT EXISTS sim.project_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_management_plans_project ON sim.project_management_plans(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_project_management_plans_status ON sim.project_management_plans(status) WHERE is_deleted = false;

ALTER TABLE sim.project_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_management_plans_select" ON sim.project_management_plans;
CREATE POLICY "project_management_plans_select" ON sim.project_management_plans FOR SELECT USING (
  sim.project_management_plans.created_by = auth.uid() OR sim.project_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_management_plans_insert" ON sim.project_management_plans;
CREATE POLICY "project_management_plans_insert" ON sim.project_management_plans FOR INSERT WITH CHECK (
  sim.project_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_management_plans_update" ON sim.project_management_plans;
CREATE POLICY "project_management_plans_update" ON sim.project_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR sim.project_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_management_plans_delete" ON sim.project_management_plans;
CREATE POLICY "project_management_plans_delete" ON sim.project_management_plans FOR DELETE USING (created_by = auth.uid());

-- Requirements Management Plan templates
CREATE TABLE IF NOT EXISTS sim.requirements_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_requirements_management_plans_project ON sim.requirements_management_plans(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_requirements_management_plans_status ON sim.requirements_management_plans(status) WHERE is_deleted = false;

ALTER TABLE sim.requirements_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirements_management_plans_select" ON sim.requirements_management_plans;
CREATE POLICY "requirements_management_plans_select" ON sim.requirements_management_plans FOR SELECT USING (
  sim.requirements_management_plans.created_by = auth.uid() OR sim.requirements_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "requirements_management_plans_insert" ON sim.requirements_management_plans;
CREATE POLICY "requirements_management_plans_insert" ON sim.requirements_management_plans FOR INSERT WITH CHECK (
  sim.requirements_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "requirements_management_plans_update" ON sim.requirements_management_plans;
CREATE POLICY "requirements_management_plans_update" ON sim.requirements_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR sim.requirements_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "requirements_management_plans_delete" ON sim.requirements_management_plans;
CREATE POLICY "requirements_management_plans_delete" ON sim.requirements_management_plans FOR DELETE USING (created_by = auth.uid());

-- Requirements documentation templates
CREATE TABLE IF NOT EXISTS sim.requirements_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_requirements_documentation_project ON sim.requirements_documentation(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_requirements_documentation_status ON sim.requirements_documentation(status) WHERE is_deleted = false;

ALTER TABLE sim.requirements_documentation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "requirements_documentation_select" ON sim.requirements_documentation;
CREATE POLICY "requirements_documentation_select" ON sim.requirements_documentation FOR SELECT USING (
  sim.requirements_documentation.created_by = auth.uid() OR sim.requirements_documentation.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "requirements_documentation_insert" ON sim.requirements_documentation;
CREATE POLICY "requirements_documentation_insert" ON sim.requirements_documentation FOR INSERT WITH CHECK (
  sim.requirements_documentation.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "requirements_documentation_update" ON sim.requirements_documentation;
CREATE POLICY "requirements_documentation_update" ON sim.requirements_documentation FOR UPDATE USING (
  created_by = auth.uid() OR sim.requirements_documentation.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "requirements_documentation_delete" ON sim.requirements_documentation;
CREATE POLICY "requirements_documentation_delete" ON sim.requirements_documentation FOR DELETE USING (created_by = auth.uid());

-- WBS dictionary entries linked to WBS nodes
CREATE TABLE IF NOT EXISTS sim.wbs_dictionary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  wbs_node_id uuid
);

CREATE INDEX IF NOT EXISTS idx_wbs_dictionary_entries_project ON sim.wbs_dictionary_entries(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_wbs_dictionary_entries_status ON sim.wbs_dictionary_entries(status) WHERE is_deleted = false;

ALTER TABLE sim.wbs_dictionary_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wbs_dictionary_entries_select" ON sim.wbs_dictionary_entries;
CREATE POLICY "wbs_dictionary_entries_select" ON sim.wbs_dictionary_entries FOR SELECT USING (
  sim.wbs_dictionary_entries.created_by = auth.uid() OR sim.wbs_dictionary_entries.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "wbs_dictionary_entries_insert" ON sim.wbs_dictionary_entries;
CREATE POLICY "wbs_dictionary_entries_insert" ON sim.wbs_dictionary_entries FOR INSERT WITH CHECK (
  sim.wbs_dictionary_entries.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "wbs_dictionary_entries_update" ON sim.wbs_dictionary_entries;
CREATE POLICY "wbs_dictionary_entries_update" ON sim.wbs_dictionary_entries FOR UPDATE USING (
  created_by = auth.uid() OR sim.wbs_dictionary_entries.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "wbs_dictionary_entries_delete" ON sim.wbs_dictionary_entries;
CREATE POLICY "wbs_dictionary_entries_delete" ON sim.wbs_dictionary_entries FOR DELETE USING (created_by = auth.uid());

-- Activity attributes linked to activity list
CREATE TABLE IF NOT EXISTS sim.activity_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  activity_id uuid
);

CREATE INDEX IF NOT EXISTS idx_activity_attributes_project ON sim.activity_attributes(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_attributes_status ON sim.activity_attributes(status) WHERE is_deleted = false;

ALTER TABLE sim.activity_attributes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_attributes_select" ON sim.activity_attributes;
CREATE POLICY "activity_attributes_select" ON sim.activity_attributes FOR SELECT USING (
  sim.activity_attributes.created_by = auth.uid() OR sim.activity_attributes.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_attributes_insert" ON sim.activity_attributes;
CREATE POLICY "activity_attributes_insert" ON sim.activity_attributes FOR INSERT WITH CHECK (
  sim.activity_attributes.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_attributes_update" ON sim.activity_attributes;
CREATE POLICY "activity_attributes_update" ON sim.activity_attributes FOR UPDATE USING (
  created_by = auth.uid() OR sim.activity_attributes.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_attributes_delete" ON sim.activity_attributes;
CREATE POLICY "activity_attributes_delete" ON sim.activity_attributes FOR DELETE USING (created_by = auth.uid());

-- Activity resource requirements
CREATE TABLE IF NOT EXISTS sim.activity_resource_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  activity_id uuid
);

CREATE INDEX IF NOT EXISTS idx_activity_resource_requirements_project ON sim.activity_resource_requirements(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_resource_requirements_status ON sim.activity_resource_requirements(status) WHERE is_deleted = false;

ALTER TABLE sim.activity_resource_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_resource_requirements_select" ON sim.activity_resource_requirements;
CREATE POLICY "activity_resource_requirements_select" ON sim.activity_resource_requirements FOR SELECT USING (
  sim.activity_resource_requirements.created_by = auth.uid() OR sim.activity_resource_requirements.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_resource_requirements_insert" ON sim.activity_resource_requirements;
CREATE POLICY "activity_resource_requirements_insert" ON sim.activity_resource_requirements FOR INSERT WITH CHECK (
  sim.activity_resource_requirements.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_resource_requirements_update" ON sim.activity_resource_requirements;
CREATE POLICY "activity_resource_requirements_update" ON sim.activity_resource_requirements FOR UPDATE USING (
  created_by = auth.uid() OR sim.activity_resource_requirements.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_resource_requirements_delete" ON sim.activity_resource_requirements;
CREATE POLICY "activity_resource_requirements_delete" ON sim.activity_resource_requirements FOR DELETE USING (created_by = auth.uid());

-- Resource Breakdown Structure templates
CREATE TABLE IF NOT EXISTS sim.resource_breakdown_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_resource_breakdown_structure_project ON sim.resource_breakdown_structure(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_breakdown_structure_status ON sim.resource_breakdown_structure(status) WHERE is_deleted = false;

ALTER TABLE sim.resource_breakdown_structure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_breakdown_structure_select" ON sim.resource_breakdown_structure;
CREATE POLICY "resource_breakdown_structure_select" ON sim.resource_breakdown_structure FOR SELECT USING (
  sim.resource_breakdown_structure.created_by = auth.uid() OR sim.resource_breakdown_structure.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "resource_breakdown_structure_insert" ON sim.resource_breakdown_structure;
CREATE POLICY "resource_breakdown_structure_insert" ON sim.resource_breakdown_structure FOR INSERT WITH CHECK (
  sim.resource_breakdown_structure.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "resource_breakdown_structure_update" ON sim.resource_breakdown_structure;
CREATE POLICY "resource_breakdown_structure_update" ON sim.resource_breakdown_structure FOR UPDATE USING (
  created_by = auth.uid() OR sim.resource_breakdown_structure.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "resource_breakdown_structure_delete" ON sim.resource_breakdown_structure;
CREATE POLICY "resource_breakdown_structure_delete" ON sim.resource_breakdown_structure FOR DELETE USING (created_by = auth.uid());

-- Activity duration estimates
CREATE TABLE IF NOT EXISTS sim.activity_duration_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  activity_id uuid
);

CREATE INDEX IF NOT EXISTS idx_activity_duration_estimates_project ON sim.activity_duration_estimates(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_duration_estimates_status ON sim.activity_duration_estimates(status) WHERE is_deleted = false;

ALTER TABLE sim.activity_duration_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_duration_estimates_select" ON sim.activity_duration_estimates;
CREATE POLICY "activity_duration_estimates_select" ON sim.activity_duration_estimates FOR SELECT USING (
  sim.activity_duration_estimates.created_by = auth.uid() OR sim.activity_duration_estimates.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_duration_estimates_insert" ON sim.activity_duration_estimates;
CREATE POLICY "activity_duration_estimates_insert" ON sim.activity_duration_estimates FOR INSERT WITH CHECK (
  sim.activity_duration_estimates.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_duration_estimates_update" ON sim.activity_duration_estimates;
CREATE POLICY "activity_duration_estimates_update" ON sim.activity_duration_estimates FOR UPDATE USING (
  created_by = auth.uid() OR sim.activity_duration_estimates.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_duration_estimates_delete" ON sim.activity_duration_estimates;
CREATE POLICY "activity_duration_estimates_delete" ON sim.activity_duration_estimates FOR DELETE USING (created_by = auth.uid());

-- Cost Management Plan templates
CREATE TABLE IF NOT EXISTS sim.cost_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cost_management_plans_project ON sim.cost_management_plans(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_cost_management_plans_status ON sim.cost_management_plans(status) WHERE is_deleted = false;

ALTER TABLE sim.cost_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_management_plans_select" ON sim.cost_management_plans;
CREATE POLICY "cost_management_plans_select" ON sim.cost_management_plans FOR SELECT USING (
  sim.cost_management_plans.created_by = auth.uid() OR sim.cost_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "cost_management_plans_insert" ON sim.cost_management_plans;
CREATE POLICY "cost_management_plans_insert" ON sim.cost_management_plans FOR INSERT WITH CHECK (
  sim.cost_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "cost_management_plans_update" ON sim.cost_management_plans;
CREATE POLICY "cost_management_plans_update" ON sim.cost_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR sim.cost_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "cost_management_plans_delete" ON sim.cost_management_plans;
CREATE POLICY "cost_management_plans_delete" ON sim.cost_management_plans FOR DELETE USING (created_by = auth.uid());

-- Activity cost estimates
CREATE TABLE IF NOT EXISTS sim.activity_cost_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false,
  activity_id uuid
);

CREATE INDEX IF NOT EXISTS idx_activity_cost_estimates_project ON sim.activity_cost_estimates(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_activity_cost_estimates_status ON sim.activity_cost_estimates(status) WHERE is_deleted = false;

ALTER TABLE sim.activity_cost_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_cost_estimates_select" ON sim.activity_cost_estimates;
CREATE POLICY "activity_cost_estimates_select" ON sim.activity_cost_estimates FOR SELECT USING (
  sim.activity_cost_estimates.created_by = auth.uid() OR sim.activity_cost_estimates.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_cost_estimates_insert" ON sim.activity_cost_estimates;
CREATE POLICY "activity_cost_estimates_insert" ON sim.activity_cost_estimates FOR INSERT WITH CHECK (
  sim.activity_cost_estimates.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_cost_estimates_update" ON sim.activity_cost_estimates;
CREATE POLICY "activity_cost_estimates_update" ON sim.activity_cost_estimates FOR UPDATE USING (
  created_by = auth.uid() OR sim.activity_cost_estimates.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "activity_cost_estimates_delete" ON sim.activity_cost_estimates;
CREATE POLICY "activity_cost_estimates_delete" ON sim.activity_cost_estimates FOR DELETE USING (created_by = auth.uid());

-- Cost baseline templates
CREATE TABLE IF NOT EXISTS sim.cost_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cost_baselines_project ON sim.cost_baselines(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_cost_baselines_status ON sim.cost_baselines(status) WHERE is_deleted = false;

ALTER TABLE sim.cost_baselines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_baselines_select" ON sim.cost_baselines;
CREATE POLICY "cost_baselines_select" ON sim.cost_baselines FOR SELECT USING (
  sim.cost_baselines.created_by = auth.uid() OR sim.cost_baselines.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "cost_baselines_insert" ON sim.cost_baselines;
CREATE POLICY "cost_baselines_insert" ON sim.cost_baselines FOR INSERT WITH CHECK (
  sim.cost_baselines.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "cost_baselines_update" ON sim.cost_baselines;
CREATE POLICY "cost_baselines_update" ON sim.cost_baselines FOR UPDATE USING (
  created_by = auth.uid() OR sim.cost_baselines.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "cost_baselines_delete" ON sim.cost_baselines;
CREATE POLICY "cost_baselines_delete" ON sim.cost_baselines FOR DELETE USING (created_by = auth.uid());

-- Resource Management Plan templates
CREATE TABLE IF NOT EXISTS sim.resource_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_resource_management_plans_project ON sim.resource_management_plans(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_resource_management_plans_status ON sim.resource_management_plans(status) WHERE is_deleted = false;

ALTER TABLE sim.resource_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resource_management_plans_select" ON sim.resource_management_plans;
CREATE POLICY "resource_management_plans_select" ON sim.resource_management_plans FOR SELECT USING (
  sim.resource_management_plans.created_by = auth.uid() OR sim.resource_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "resource_management_plans_insert" ON sim.resource_management_plans;
CREATE POLICY "resource_management_plans_insert" ON sim.resource_management_plans FOR INSERT WITH CHECK (
  sim.resource_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "resource_management_plans_update" ON sim.resource_management_plans;
CREATE POLICY "resource_management_plans_update" ON sim.resource_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR sim.resource_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "resource_management_plans_delete" ON sim.resource_management_plans;
CREATE POLICY "resource_management_plans_delete" ON sim.resource_management_plans FOR DELETE USING (created_by = auth.uid());

-- Stakeholder Engagement Plan templates
CREATE TABLE IF NOT EXISTS sim.stakeholder_engagement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_plans_project ON sim.stakeholder_engagement_plans(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_stakeholder_engagement_plans_status ON sim.stakeholder_engagement_plans(status) WHERE is_deleted = false;

ALTER TABLE sim.stakeholder_engagement_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stakeholder_engagement_plans_select" ON sim.stakeholder_engagement_plans;
CREATE POLICY "stakeholder_engagement_plans_select" ON sim.stakeholder_engagement_plans FOR SELECT USING (
  sim.stakeholder_engagement_plans.created_by = auth.uid() OR sim.stakeholder_engagement_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "stakeholder_engagement_plans_insert" ON sim.stakeholder_engagement_plans;
CREATE POLICY "stakeholder_engagement_plans_insert" ON sim.stakeholder_engagement_plans FOR INSERT WITH CHECK (
  sim.stakeholder_engagement_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "stakeholder_engagement_plans_update" ON sim.stakeholder_engagement_plans;
CREATE POLICY "stakeholder_engagement_plans_update" ON sim.stakeholder_engagement_plans FOR UPDATE USING (
  created_by = auth.uid() OR sim.stakeholder_engagement_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "stakeholder_engagement_plans_delete" ON sim.stakeholder_engagement_plans;
CREATE POLICY "stakeholder_engagement_plans_delete" ON sim.stakeholder_engagement_plans FOR DELETE USING (created_by = auth.uid());

-- Procurement Management Plan templates
CREATE TABLE IF NOT EXISTS sim.procurement_management_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_procurement_management_plans_project ON sim.procurement_management_plans(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_procurement_management_plans_status ON sim.procurement_management_plans(status) WHERE is_deleted = false;

ALTER TABLE sim.procurement_management_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "procurement_management_plans_select" ON sim.procurement_management_plans;
CREATE POLICY "procurement_management_plans_select" ON sim.procurement_management_plans FOR SELECT USING (
  sim.procurement_management_plans.created_by = auth.uid() OR sim.procurement_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "procurement_management_plans_insert" ON sim.procurement_management_plans;
CREATE POLICY "procurement_management_plans_insert" ON sim.procurement_management_plans FOR INSERT WITH CHECK (
  sim.procurement_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "procurement_management_plans_update" ON sim.procurement_management_plans;
CREATE POLICY "procurement_management_plans_update" ON sim.procurement_management_plans FOR UPDATE USING (
  created_by = auth.uid() OR sim.procurement_management_plans.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "procurement_management_plans_delete" ON sim.procurement_management_plans;
CREATE POLICY "procurement_management_plans_delete" ON sim.procurement_management_plans FOR DELETE USING (created_by = auth.uid());

-- Quality checklist headers
CREATE TABLE IF NOT EXISTS sim.quality_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_quality_checklists_project ON sim.quality_checklists(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_quality_checklists_status ON sim.quality_checklists(status) WHERE is_deleted = false;

ALTER TABLE sim.quality_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quality_checklists_select" ON sim.quality_checklists;
CREATE POLICY "quality_checklists_select" ON sim.quality_checklists FOR SELECT USING (
  sim.quality_checklists.created_by = auth.uid() OR sim.quality_checklists.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "quality_checklists_insert" ON sim.quality_checklists;
CREATE POLICY "quality_checklists_insert" ON sim.quality_checklists FOR INSERT WITH CHECK (
  sim.quality_checklists.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "quality_checklists_update" ON sim.quality_checklists;
CREATE POLICY "quality_checklists_update" ON sim.quality_checklists FOR UPDATE USING (
  created_by = auth.uid() OR sim.quality_checklists.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "quality_checklists_delete" ON sim.quality_checklists;
CREATE POLICY "quality_checklists_delete" ON sim.quality_checklists FOR DELETE USING (created_by = auth.uid());

-- Team performance assessment templates
CREATE TABLE IF NOT EXISTS sim.team_performance_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_team_performance_assessments_project ON sim.team_performance_assessments(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_team_performance_assessments_status ON sim.team_performance_assessments(status) WHERE is_deleted = false;

ALTER TABLE sim.team_performance_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_performance_assessments_select" ON sim.team_performance_assessments;
CREATE POLICY "team_performance_assessments_select" ON sim.team_performance_assessments FOR SELECT USING (
  sim.team_performance_assessments.created_by = auth.uid() OR sim.team_performance_assessments.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "team_performance_assessments_insert" ON sim.team_performance_assessments;
CREATE POLICY "team_performance_assessments_insert" ON sim.team_performance_assessments FOR INSERT WITH CHECK (
  sim.team_performance_assessments.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "team_performance_assessments_update" ON sim.team_performance_assessments;
CREATE POLICY "team_performance_assessments_update" ON sim.team_performance_assessments FOR UPDATE USING (
  created_by = auth.uid() OR sim.team_performance_assessments.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "team_performance_assessments_delete" ON sim.team_performance_assessments;
CREATE POLICY "team_performance_assessments_delete" ON sim.team_performance_assessments FOR DELETE USING (created_by = auth.uid());

-- Make-or-buy decision log entries
CREATE TABLE IF NOT EXISTS sim.make_or_buy_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_make_or_buy_decisions_project ON sim.make_or_buy_decisions(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_make_or_buy_decisions_status ON sim.make_or_buy_decisions(status) WHERE is_deleted = false;

ALTER TABLE sim.make_or_buy_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "make_or_buy_decisions_select" ON sim.make_or_buy_decisions;
CREATE POLICY "make_or_buy_decisions_select" ON sim.make_or_buy_decisions FOR SELECT USING (
  sim.make_or_buy_decisions.created_by = auth.uid() OR sim.make_or_buy_decisions.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "make_or_buy_decisions_insert" ON sim.make_or_buy_decisions;
CREATE POLICY "make_or_buy_decisions_insert" ON sim.make_or_buy_decisions FOR INSERT WITH CHECK (
  sim.make_or_buy_decisions.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "make_or_buy_decisions_update" ON sim.make_or_buy_decisions;
CREATE POLICY "make_or_buy_decisions_update" ON sim.make_or_buy_decisions FOR UPDATE USING (
  created_by = auth.uid() OR sim.make_or_buy_decisions.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "make_or_buy_decisions_delete" ON sim.make_or_buy_decisions;
CREATE POLICY "make_or_buy_decisions_delete" ON sim.make_or_buy_decisions FOR DELETE USING (created_by = auth.uid());

-- Variance analysis report templates
CREATE TABLE IF NOT EXISTS sim.variance_analysis_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_variance_analysis_reports_project ON sim.variance_analysis_reports(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_variance_analysis_reports_status ON sim.variance_analysis_reports(status) WHERE is_deleted = false;

ALTER TABLE sim.variance_analysis_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "variance_analysis_reports_select" ON sim.variance_analysis_reports;
CREATE POLICY "variance_analysis_reports_select" ON sim.variance_analysis_reports FOR SELECT USING (
  sim.variance_analysis_reports.created_by = auth.uid() OR sim.variance_analysis_reports.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "variance_analysis_reports_insert" ON sim.variance_analysis_reports;
CREATE POLICY "variance_analysis_reports_insert" ON sim.variance_analysis_reports FOR INSERT WITH CHECK (
  sim.variance_analysis_reports.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "variance_analysis_reports_update" ON sim.variance_analysis_reports;
CREATE POLICY "variance_analysis_reports_update" ON sim.variance_analysis_reports FOR UPDATE USING (
  created_by = auth.uid() OR sim.variance_analysis_reports.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "variance_analysis_reports_delete" ON sim.variance_analysis_reports;
CREATE POLICY "variance_analysis_reports_delete" ON sim.variance_analysis_reports FOR DELETE USING (created_by = auth.uid());

-- Earned value status report templates
CREATE TABLE IF NOT EXISTS sim.evm_status_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_evm_status_reports_project ON sim.evm_status_reports(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_evm_status_reports_status ON sim.evm_status_reports(status) WHERE is_deleted = false;

ALTER TABLE sim.evm_status_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "evm_status_reports_select" ON sim.evm_status_reports;
CREATE POLICY "evm_status_reports_select" ON sim.evm_status_reports FOR SELECT USING (
  sim.evm_status_reports.created_by = auth.uid() OR sim.evm_status_reports.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "evm_status_reports_insert" ON sim.evm_status_reports;
CREATE POLICY "evm_status_reports_insert" ON sim.evm_status_reports FOR INSERT WITH CHECK (
  sim.evm_status_reports.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "evm_status_reports_update" ON sim.evm_status_reports;
CREATE POLICY "evm_status_reports_update" ON sim.evm_status_reports FOR UPDATE USING (
  created_by = auth.uid() OR sim.evm_status_reports.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "evm_status_reports_delete" ON sim.evm_status_reports;
CREATE POLICY "evm_status_reports_delete" ON sim.evm_status_reports FOR DELETE USING (created_by = auth.uid());

-- Scope validation and deliverable acceptance forms
CREATE TABLE IF NOT EXISTS sim.scope_acceptance_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_scope_acceptance_forms_project ON sim.scope_acceptance_forms(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_scope_acceptance_forms_status ON sim.scope_acceptance_forms(status) WHERE is_deleted = false;

ALTER TABLE sim.scope_acceptance_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scope_acceptance_forms_select" ON sim.scope_acceptance_forms;
CREATE POLICY "scope_acceptance_forms_select" ON sim.scope_acceptance_forms FOR SELECT USING (
  sim.scope_acceptance_forms.created_by = auth.uid() OR sim.scope_acceptance_forms.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "scope_acceptance_forms_insert" ON sim.scope_acceptance_forms;
CREATE POLICY "scope_acceptance_forms_insert" ON sim.scope_acceptance_forms FOR INSERT WITH CHECK (
  sim.scope_acceptance_forms.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "scope_acceptance_forms_update" ON sim.scope_acceptance_forms;
CREATE POLICY "scope_acceptance_forms_update" ON sim.scope_acceptance_forms FOR UPDATE USING (
  created_by = auth.uid() OR sim.scope_acceptance_forms.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "scope_acceptance_forms_delete" ON sim.scope_acceptance_forms;
CREATE POLICY "scope_acceptance_forms_delete" ON sim.scope_acceptance_forms FOR DELETE USING (created_by = auth.uid());

-- Project closure checklist headers
CREATE TABLE IF NOT EXISTS sim.project_closure_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_project_closure_checklists_project ON sim.project_closure_checklists(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_project_closure_checklists_status ON sim.project_closure_checklists(status) WHERE is_deleted = false;

ALTER TABLE sim.project_closure_checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_closure_checklists_select" ON sim.project_closure_checklists;
CREATE POLICY "project_closure_checklists_select" ON sim.project_closure_checklists FOR SELECT USING (
  sim.project_closure_checklists.created_by = auth.uid() OR sim.project_closure_checklists.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_closure_checklists_insert" ON sim.project_closure_checklists;
CREATE POLICY "project_closure_checklists_insert" ON sim.project_closure_checklists FOR INSERT WITH CHECK (
  sim.project_closure_checklists.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_closure_checklists_update" ON sim.project_closure_checklists;
CREATE POLICY "project_closure_checklists_update" ON sim.project_closure_checklists FOR UPDATE USING (
  created_by = auth.uid() OR sim.project_closure_checklists.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "project_closure_checklists_delete" ON sim.project_closure_checklists;
CREATE POLICY "project_closure_checklists_delete" ON sim.project_closure_checklists FOR DELETE USING (created_by = auth.uid());

-- Contract closure document templates
CREATE TABLE IF NOT EXISTS sim.contract_closure_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id uuid NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_contract_closure_documents_project ON sim.contract_closure_documents(practice_project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_contract_closure_documents_status ON sim.contract_closure_documents(status) WHERE is_deleted = false;

ALTER TABLE sim.contract_closure_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_closure_documents_select" ON sim.contract_closure_documents;
CREATE POLICY "contract_closure_documents_select" ON sim.contract_closure_documents FOR SELECT USING (
  sim.contract_closure_documents.created_by = auth.uid() OR sim.contract_closure_documents.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "contract_closure_documents_insert" ON sim.contract_closure_documents;
CREATE POLICY "contract_closure_documents_insert" ON sim.contract_closure_documents FOR INSERT WITH CHECK (
  sim.contract_closure_documents.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "contract_closure_documents_update" ON sim.contract_closure_documents;
CREATE POLICY "contract_closure_documents_update" ON sim.contract_closure_documents FOR UPDATE USING (
  created_by = auth.uid() OR sim.contract_closure_documents.practice_project_id IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "contract_closure_documents_delete" ON sim.contract_closure_documents;
CREATE POLICY "contract_closure_documents_delete" ON sim.contract_closure_documents FOR DELETE USING (created_by = auth.uid());

CREATE TABLE IF NOT EXISTS sim.quality_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES sim.quality_checklists(id) ON DELETE CASCADE,
  item_order integer NOT NULL DEFAULT 1,
  item_text text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE sim.quality_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quality_checklist_items_all" ON sim.quality_checklist_items;
CREATE POLICY "quality_checklist_items_all" ON sim.quality_checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM sim.quality_checklists p WHERE p.id = sim.quality_checklist_items.checklist_id)
);

CREATE TABLE IF NOT EXISTS sim.project_closure_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES sim.project_closure_checklists(id) ON DELETE CASCADE,
  item_order integer NOT NULL DEFAULT 1,
  item_text text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE sim.project_closure_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_closure_checklist_items_all" ON sim.project_closure_checklist_items;
CREATE POLICY "project_closure_checklist_items_all" ON sim.project_closure_checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM sim.project_closure_checklists p WHERE p.id = sim.project_closure_checklist_items.checklist_id)
);

-- ── database_tables registry ─────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_charters', 'PMBOK Project Charter templates', false, true),
  ('assumption_logs', 'Assumption log templates', false, true),
  ('project_management_plans', 'Project Management Plan templates', false, true),
  ('requirements_management_plans', 'Requirements Management Plan templates', false, true),
  ('requirements_documentation', 'Requirements documentation templates', false, true),
  ('wbs_dictionary_entries', 'WBS dictionary entries linked to WBS nodes', false, true),
  ('activity_attributes', 'Activity attributes linked to activity list', false, true),
  ('activity_resource_requirements', 'Activity resource requirements', false, true),
  ('resource_breakdown_structure', 'Resource Breakdown Structure templates', false, true),
  ('activity_duration_estimates', 'Activity duration estimates', false, true),
  ('cost_management_plans', 'Cost Management Plan templates', false, true),
  ('activity_cost_estimates', 'Activity cost estimates', false, true),
  ('cost_baselines', 'Cost baseline templates', false, true),
  ('resource_management_plans', 'Resource Management Plan templates', false, true),
  ('stakeholder_engagement_plans', 'Stakeholder Engagement Plan templates', false, true),
  ('procurement_management_plans', 'Procurement Management Plan templates', false, true),
  ('quality_checklists', 'Quality checklist headers', false, true),
  ('team_performance_assessments', 'Team performance assessment templates', false, true),
  ('make_or_buy_decisions', 'Make-or-buy decision log entries', false, true),
  ('variance_analysis_reports', 'Variance analysis report templates', false, true),
  ('evm_status_reports', 'Earned value status report templates', false, true),
  ('scope_acceptance_forms', 'Scope validation and deliverable acceptance forms', false, true),
  ('project_closure_checklists', 'Project closure checklist headers', false, true),
  ('contract_closure_documents', 'Contract closure document templates', false, true),
  ('quality_checklist_items', 'Line items for quality checklists', false, true),
  ('project_closure_checklist_items', 'Line items for project closure checklists', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
