-- v469: Platform dashboard 403/404 — RLS + grants + resource allocation table access
-- Date: 2026-04-19
--
-- Root cause:
--   Many v09/v452 policies use user_projects.user_id = auth.uid() or user_roles.user_id = auth.uid(),
--   but those FKs reference public.users(id), while auth.uid() is auth.users.id. Policies never match → 403.
--   cross_project_resource_allocations has RLS ON from v38 but no policies → 403 on any SELECT.
--   public.tasks often has no GRANT / no RLS policies when RLS is enabled elsewhere.
--
-- Prerequisites: public.auth_user_can_access_project(UUID) (v406+),
--                public.user_has_access_to_account(UUID) (v400+),
--                public.is_pmo_admin_user() (v258+)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table privileges (REST requires GRANT even when RLS passes)
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;

GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;

GRANT SELECT ON public.plan_intelligence_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_intelligence_findings TO authenticated;

GRANT SELECT ON public.plan_intelligence_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_intelligence_rules TO authenticated;

GRANT SELECT ON public.cross_project_resource_allocations TO authenticated;
GRANT SELECT ON public.resources TO authenticated;

-- ---------------------------------------------------------------------------
-- tasks — RLS aligned with project access
-- ---------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select_access ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_access ON public.tasks;
DROP POLICY IF EXISTS tasks_update_access ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_access ON public.tasks;

CREATE POLICY tasks_select_access ON public.tasks
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.auth_user_can_access_project(project_id)
  );

CREATE POLICY tasks_insert_access ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.auth_user_can_access_project(project_id)
  );

CREATE POLICY tasks_update_access ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.auth_user_can_access_project(project_id)
  );

CREATE POLICY tasks_delete_access ON public.tasks
  FOR DELETE TO authenticated
  USING (public.auth_user_can_access_project(project_id));

-- ---------------------------------------------------------------------------
-- teams — replace legacy policies from v09
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_teams_member_read ON public.teams;
DROP POLICY IF EXISTS policy_teams_owner_all ON public.teams;
DROP POLICY IF EXISTS policy_teams_admin_all ON public.teams;

CREATE POLICY teams_select_access ON public.teams
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.auth_user_can_access_project(project_id)
  );

CREATE POLICY teams_modify_owner_admin ON public.teams
  FOR ALL TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND EXISTS (
      SELECT 1
      FROM public.user_projects up
      INNER JOIN public.users u ON u.id = up.user_id
      WHERE up.project_id = teams.project_id
        AND u.auth_user_id = auth.uid()
        AND up.access_level IN ('owner', 'admin')
        AND COALESCE(up.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_projects up
      INNER JOIN public.users u ON u.id = up.user_id
      WHERE up.project_id = teams.project_id
        AND u.auth_user_id = auth.uid()
        AND up.access_level IN ('owner', 'admin')
        AND COALESCE(up.is_deleted, FALSE) = FALSE
    )
  );

CREATE POLICY teams_admin_system ON public.teams
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.roles r ON r.id = ur.role_id
      INNER JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND r.role_name IN ('System Admin', 'system_admin')
    )
  )
  WITH CHECK (TRUE);

-- ---------------------------------------------------------------------------
-- plan_intelligence_findings
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS intel_findings_select ON public.plan_intelligence_findings;
DROP POLICY IF EXISTS intel_findings_insert ON public.plan_intelligence_findings;
DROP POLICY IF EXISTS intel_findings_update ON public.plan_intelligence_findings;

CREATE POLICY intel_findings_select ON public.plan_intelligence_findings
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));

CREATE POLICY intel_findings_insert ON public.plan_intelligence_findings
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

CREATE POLICY intel_findings_update ON public.plan_intelligence_findings
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

-- ---------------------------------------------------------------------------
-- plan_intelligence_rules
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS intel_rules_select ON public.plan_intelligence_rules;
DROP POLICY IF EXISTS intel_rules_insert ON public.plan_intelligence_rules;
DROP POLICY IF EXISTS intel_rules_update ON public.plan_intelligence_rules;

CREATE POLICY intel_rules_select ON public.plan_intelligence_rules
  FOR SELECT TO authenticated
  USING (
    organisation_id IS NULL
    OR public.user_has_access_to_account(organisation_id)
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.account_id = plan_intelligence_rules.organisation_id
        AND COALESCE(p.is_deleted, FALSE) = FALSE
        AND public.auth_user_can_access_project(p.id)
    )
  );

CREATE POLICY intel_rules_insert ON public.plan_intelligence_rules
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

CREATE POLICY intel_rules_update ON public.plan_intelligence_rules
  FOR UPDATE TO authenticated
  USING (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    AND (organisation_id IS NULL OR public.user_has_access_to_account(organisation_id))
  );

-- ---------------------------------------------------------------------------
-- cross_project_resource_allocations — was: RLS ON, zero policies → deny all
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS cross_project_alloc_select ON public.cross_project_resource_allocations;

CREATE POLICY cross_project_alloc_select ON public.cross_project_resource_allocations
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND project_id IS NOT NULL
    AND public.auth_user_can_access_project(project_id)
  );
