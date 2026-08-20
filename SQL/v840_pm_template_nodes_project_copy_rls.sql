-- =============================================================================
-- v840: Allow project members to write project-tier pm_template_nodes
--
-- Symptom: after v839 unblocked form_templates, "Copy down to my project" fails
--   with: new row violates row-level security policy for table "pm_template_nodes"
--
-- Cause: public.can_manage_pm_template_node (v764b) only treated the named
--   projects.project_manager_user_id as allowed for tier='project'. Many real
--   PMs are linked via project_memberships / user_projects / user_roles instead
--   (see auth_user_can_access_project). v824 copy-down requires those users to
--   INSERT a project-scoped node (+ entity assignment).
--
-- Fix: for project tier/scope, also allow public.auth_user_can_access_project().
--   Keep portfolio/programme manager checks and PMO-admin path unchanged.
--   Mirror on pm_template_entity_assignment write (same project_manager-only gap).
--   Simulator: broaden practice_projects check the same way.
--
-- Apply after: v764b, v764c, v406 (auth_user_can_access_project), v839.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) public.can_manage_pm_template_node
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_pm_template_node(
    p_account_id UUID,
    p_tier TEXT,
    p_scope_entity_type TEXT,
    p_scope_entity_id UUID,
    p_is_system_synced BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COALESCE(p_is_system_synced, FALSE) = FALSE
        AND public.user_has_access_to_account(p_account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
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
            OR (
                p_tier = 'project'
                AND p_scope_entity_id IS NOT NULL
                AND public.auth_user_can_access_project(p_scope_entity_id)
            )
        );
$$;

COMMENT ON FUNCTION public.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) IS
  'Whether the authenticated user may write a pm_template_nodes row at the given tier/scope. Project tier uses auth_user_can_access_project (v840) so PMs on memberships can copy-down.';

-- ---------------------------------------------------------------------------
-- 2) public.pm_template_entity_assignment — project path parity
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS pm_template_entity_assignment_write ON public.pm_template_entity_assignment;
CREATE POLICY pm_template_entity_assignment_write
    ON public.pm_template_entity_assignment
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR (
                entity_type IN ('portfolio', 'sub_portfolio')
                AND EXISTS (
                    SELECT 1
                    FROM public.portfolios p
                    INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
                    WHERE p.id = entity_id
                      AND COALESCE(p.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
            )
            OR (
                entity_type = 'programme'
                AND EXISTS (
                    SELECT 1
                    FROM public.programmes prog
                    INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
                    WHERE prog.id = entity_id
                      AND COALESCE(prog.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
            )
            OR (
                entity_type = 'project'
                AND public.auth_user_can_access_project(entity_id)
            )
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR (
                entity_type IN ('portfolio', 'sub_portfolio')
                AND EXISTS (
                    SELECT 1
                    FROM public.portfolios p
                    INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
                    WHERE p.id = entity_id
                      AND COALESCE(p.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
            )
            OR (
                entity_type = 'programme'
                AND EXISTS (
                    SELECT 1
                    FROM public.programmes prog
                    INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
                    WHERE prog.id = entity_id
                      AND COALESCE(prog.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
            )
            OR (
                entity_type = 'project'
                AND public.auth_user_can_access_project(entity_id)
            )
        )
    );

-- ---------------------------------------------------------------------------
-- 3) sim.can_manage_pm_template_node — practice project membership parity
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.can_manage_pm_template_node(
    p_account_id UUID,
    p_tier TEXT,
    p_scope_entity_type TEXT,
    p_scope_entity_id UUID,
    p_is_system_synced BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
    SELECT
        COALESCE(p_is_system_synced, FALSE) = FALSE
        AND public.user_has_access_to_account(p_account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.is_pmo_admin_user()
            OR (
                p_tier IN ('portfolio', 'sub_portfolio')
                AND p_scope_entity_id IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM sim.practice_portfolios p
                    WHERE p.id = p_scope_entity_id
                      AND COALESCE(p.is_deleted, FALSE) = FALSE
                      AND (
                          p.portfolio_manager_user_id = auth.uid()
                          OR p.user_id = auth.uid()
                      )
                )
            )
            OR (
                p_tier = 'programme'
                AND p_scope_entity_id IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM sim.practice_programmes prog
                    WHERE prog.id = p_scope_entity_id
                      AND COALESCE(prog.is_deleted, FALSE) = FALSE
                      AND (
                          prog.programme_manager_user_id = auth.uid()
                          OR prog.user_id = auth.uid()
                      )
                )
            )
            OR (
                p_tier = 'project'
                AND p_scope_entity_id IS NOT NULL
                AND sim.auth_user_can_access_practice_project(p_scope_entity_id)
            )
        );
$$;

COMMENT ON FUNCTION sim.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) IS
  'Simulator parity for pm_template_nodes write checks; project tier uses auth_user_can_access_practice_project (v840).';

DO $$
BEGIN
  RAISE NOTICE 'v840_pm_template_nodes_project_copy_rls.sql applied';
END $$;
