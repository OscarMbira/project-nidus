-- =============================================================================
-- v853: Local-form permission helpers (PM Local Forms — v852 plan)
--
-- New functions (deliberately separate from can_manage_pm_template_node so
-- fields/opa/process_template write paths are not broadened):
--   • public.auth_user_has_project_manager_role(project_id)
--   • public.can_create_local_form(account_id, tier, scope_entity_type, scope_entity_id)
--   • sim mirrors (project tier only)
--
-- Apply after: v556 (is_user_pmo_admin), v840 (can_manage_pm_template_node), v841.
-- Plan: projectplan/v852_pm_local_forms_plan.md (Phase 1.1–1.2)
-- Note: monorepo already had v852_template_library_forms_submenu.sql — this is v853.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) public.auth_user_has_project_manager_role
--    Same join pattern as v185/v191 (project_memberships ⋈ project_roles,
--    role_name = 'Project Manager'), plus named projects.project_manager_user_id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_has_project_manager_role(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        INNER JOIN public.users u ON u.id = pm.user_id
        INNER JOIN public.project_roles pr ON pr.id = pm.project_role_id
        WHERE pm.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(pm.is_active, TRUE) = TRUE
          AND COALESCE(pr.is_active, TRUE) = TRUE
          AND pr.role_name = 'Project Manager'
      )
      OR EXISTS (
        SELECT 1
        FROM public.projects proj
        INNER JOIN public.users u ON u.id = proj.project_manager_user_id
        WHERE proj.id = p_project_id
          AND COALESCE(proj.is_deleted, FALSE) = FALSE
          AND u.auth_user_id = auth.uid()
      )
    );
$$;

COMMENT ON FUNCTION public.auth_user_has_project_manager_role(UUID) IS
  'TRUE if the authenticated user holds project_roles.role_name = Project Manager on the project (memberships) or is the named project_manager_user_id (v853 local forms).';

GRANT EXECUTE ON FUNCTION public.auth_user_has_project_manager_role(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) public.can_create_local_form
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_create_local_form(
    p_account_id UUID,
    p_tier TEXT,
    p_scope_entity_type TEXT,
    p_scope_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        public.user_has_access_to_account(p_account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR (
                p_tier = 'project'
                AND p_scope_entity_id IS NOT NULL
                AND public.auth_user_has_project_manager_role(p_scope_entity_id)
            )
            OR (
                p_tier IN ('portfolio', 'sub_portfolio')
                AND p_scope_entity_id IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM public.portfolios p
                    INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
                    WHERE p.id = p_scope_entity_id
                      AND COALESCE(p.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
            )
            OR (
                p_tier = 'programme'
                AND p_scope_entity_id IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM public.programmes prog
                    INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
                    WHERE prog.id = p_scope_entity_id
                      AND COALESCE(prog.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
            )
        );
$$;

COMMENT ON FUNCTION public.can_create_local_form(UUID, TEXT, TEXT, UUID) IS
  'Whether the authenticated user may create a blank-origin local form (form_template pm_template_nodes with parent_node_id NULL) at the given tier/scope (v853).';

GRANT EXECUTE ON FUNCTION public.can_create_local_form(UUID, TEXT, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) sim.auth_user_has_project_manager_role — practice projects
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.auth_user_has_project_manager_role(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT
    p_practice_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM sim.practice_project_memberships m
        WHERE m.practice_project_id = p_practice_project_id
          AND COALESCE(m.is_active, TRUE) = TRUE
          AND (
            m.user_id = auth.uid()
            OR m.user_id = sim.get_current_user_id()
          )
          AND lower(replace(m.role_name, ' ', '_')) IN ('project_manager')
      )
      OR EXISTS (
        SELECT 1
        FROM sim.practice_projects pp
        LEFT JOIN public.users mgr ON mgr.id = pp.project_manager_user_id
        WHERE pp.id = p_practice_project_id
          AND COALESCE(pp.is_deleted, FALSE) = FALSE
          AND (
            pp.user_id = auth.uid()
            OR pp.user_id = sim.get_current_user_id()
            OR mgr.auth_user_id = auth.uid()
          )
      )
    );
$$;

COMMENT ON FUNCTION sim.auth_user_has_project_manager_role(UUID) IS
  'Simulator: TRUE if the user is practice-project manager via membership role_name or named owner/manager columns (v853).';

GRANT EXECUTE ON FUNCTION sim.auth_user_has_project_manager_role(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) sim.can_create_local_form — project tier only (no Portfolio/Programme in sim)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.can_create_local_form(
    p_account_id UUID,
    p_tier TEXT,
    p_scope_entity_type TEXT,
    p_scope_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
    SELECT
        public.user_has_access_to_account(p_account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.is_pmo_admin_user()
            OR (
                p_tier = 'project'
                AND p_scope_entity_id IS NOT NULL
                AND sim.auth_user_has_project_manager_role(p_scope_entity_id)
            )
        );
$$;

COMMENT ON FUNCTION sim.can_create_local_form(UUID, TEXT, TEXT, UUID) IS
  'Simulator parity for blank local-form creation; project + PMO admin only (v853).';

GRANT EXECUTE ON FUNCTION sim.can_create_local_form(UUID, TEXT, TEXT, UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v853_local_form_permission_function.sql applied';
END $$;
