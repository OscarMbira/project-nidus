-- ============================================================================
-- v1112: project_industries (Platform public schema)
-- ============================================================================
-- projectplan/v1106_project_multi_industry_plan.md Phase 0.
-- Lets a project carry several industries (one marked primary), mirroring
-- public.account_industries (v918) exactly. projects.industry_category_id is left in place as a
-- synced "primary industry" pointer (kept in sync by projectIndustryService.js's
-- replaceProjectIndustries()) so every existing read site that selects that single column keeps
-- working unchanged. RLS mirrors public.project_functional_roles (v1084): access-gated, not
-- edit-tier-gated (page-level canEdit handles that).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  industry_category_id UUID NOT NULL REFERENCES public.industry_categories(id),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.project_industries IS
  'v1106/v1112: multi-industry classification for a project (one primary + N secondary), '
  'mirroring account_industries at the project level. Drives pm/tm sidebar industry-pack '
  'scoping (getProjectIndustryCategoryIds) and the "Add from Built-in Roles" picker default '
  '(v1105). projects.industry_category_id stays in sync as the primary-industry pointer.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_industries_project_industry
  ON public.project_industries (project_id, industry_category_id);

-- At most one primary industry per project.
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_industries_one_primary
  ON public.project_industries (project_id) WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_project_industries_project
  ON public.project_industries(project_id);
CREATE INDEX IF NOT EXISTS idx_project_industries_industry_category
  ON public.project_industries(industry_category_id);

ALTER TABLE public.project_industries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_project_industries_select ON public.project_industries;
CREATE POLICY policy_project_industries_select ON public.project_industries
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_industries_insert ON public.project_industries;
CREATE POLICY policy_project_industries_insert ON public.project_industries
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_industries_update ON public.project_industries;
CREATE POLICY policy_project_industries_update ON public.project_industries
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_industries_delete ON public.project_industries;
CREATE POLICY policy_project_industries_delete ON public.project_industries
  FOR DELETE TO authenticated
  USING (public.auth_user_can_access_project(project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_industries TO authenticated;
GRANT ALL ON public.project_industries TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_industries', 'Multi-industry classification for a project (one primary + N secondary), mirrors account_industries at project scope (v1106/v1112)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1112_project_industries_schema.sql applied successfully';
END $$;
