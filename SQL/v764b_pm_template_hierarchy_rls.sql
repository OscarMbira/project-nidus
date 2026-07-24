-- =============================================================================
-- v764b: PM Template Hierarchy — RLS (public schema)
-- Plan: projectplan/v764_project_management_template_hierarchy_plan.md (Phase 0)
-- Prerequisites: v764_pm_template_hierarchy_tables.sql, user_has_access_to_account,
--                is_user_pmo_admin, portfolios/programmes/projects manager columns
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: can the current user manage a node at a given tier/scope?
-- -----------------------------------------------------------------------------
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
        -- Global-synced rows are never writable by Platform UI roles
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
                AND EXISTS (
                    SELECT 1
                    FROM public.projects proj
                    INNER JOIN public.users u ON u.id = proj.project_manager_user_id
                    WHERE proj.id = p_scope_entity_id
                      AND COALESCE(proj.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
            )
        );
$$;

REVOKE ALL ON FUNCTION public.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) IS
    'Whether the authenticated user may write a pm_template_nodes row at the given tier/scope.';

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.pm_template_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_template_field_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_template_entity_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_template_change_notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- pm_template_nodes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS pm_template_nodes_select ON public.pm_template_nodes;
CREATE POLICY pm_template_nodes_select
    ON public.pm_template_nodes
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS pm_template_nodes_insert ON public.pm_template_nodes;
CREATE POLICY pm_template_nodes_insert
    ON public.pm_template_nodes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.can_manage_pm_template_node(
            account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
        )
    );

DROP POLICY IF EXISTS pm_template_nodes_update ON public.pm_template_nodes;
CREATE POLICY pm_template_nodes_update
    ON public.pm_template_nodes
    FOR UPDATE
    TO authenticated
    USING (
        public.can_manage_pm_template_node(
            account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
        )
    )
    WITH CHECK (
        public.can_manage_pm_template_node(
            account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
        )
    );

DROP POLICY IF EXISTS pm_template_nodes_delete ON public.pm_template_nodes;
CREATE POLICY pm_template_nodes_delete
    ON public.pm_template_nodes
    FOR DELETE
    TO authenticated
    USING (
        public.can_manage_pm_template_node(
            account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
        )
    );

-- -----------------------------------------------------------------------------
-- pm_template_field_links (via parent node)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS pm_template_field_links_select ON public.pm_template_field_links;
CREATE POLICY pm_template_field_links_select
    ON public.pm_template_field_links
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = pm_template_field_links.node_id
              AND public.user_has_access_to_account(n.account_id)
        )
    );

DROP POLICY IF EXISTS pm_template_field_links_insert ON public.pm_template_field_links;
CREATE POLICY pm_template_field_links_insert
    ON public.pm_template_field_links
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = pm_template_field_links.node_id
              AND public.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    );

DROP POLICY IF EXISTS pm_template_field_links_update ON public.pm_template_field_links;
CREATE POLICY pm_template_field_links_update
    ON public.pm_template_field_links
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = pm_template_field_links.node_id
              AND public.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = pm_template_field_links.node_id
              AND public.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    );

DROP POLICY IF EXISTS pm_template_field_links_delete ON public.pm_template_field_links;
CREATE POLICY pm_template_field_links_delete
    ON public.pm_template_field_links
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = pm_template_field_links.node_id
              AND public.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    );

-- -----------------------------------------------------------------------------
-- pm_template_entity_assignment
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS pm_template_entity_assignment_select ON public.pm_template_entity_assignment;
CREATE POLICY pm_template_entity_assignment_select
    ON public.pm_template_entity_assignment
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(account_id));

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
                AND EXISTS (
                    SELECT 1
                    FROM public.projects proj
                    INNER JOIN public.users u ON u.id = proj.project_manager_user_id
                    WHERE proj.id = entity_id
                      AND COALESCE(proj.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
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
                AND EXISTS (
                    SELECT 1
                    FROM public.projects proj
                    INNER JOIN public.users u ON u.id = proj.project_manager_user_id
                    WHERE proj.id = entity_id
                      AND COALESCE(proj.is_deleted, FALSE) = FALSE
                      AND u.auth_user_id = auth.uid()
                )
            )
        )
    );

-- -----------------------------------------------------------------------------
-- pm_template_change_notifications
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS pm_template_change_notifications_select ON public.pm_template_change_notifications;
CREATE POLICY pm_template_change_notifications_select
    ON public.pm_template_change_notifications
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS pm_template_change_notifications_update ON public.pm_template_change_notifications;
CREATE POLICY pm_template_change_notifications_update
    ON public.pm_template_change_notifications
    FOR UPDATE
    TO authenticated
    USING (public.user_has_access_to_account(account_id))
    WITH CHECK (public.user_has_access_to_account(account_id));

-- Inserts typically come from service/trigger paths; allow PMO admins + managers of descendant node
DROP POLICY IF EXISTS pm_template_change_notifications_insert ON public.pm_template_change_notifications;
CREATE POLICY pm_template_change_notifications_insert
    ON public.pm_template_change_notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.pm_template_nodes n
                WHERE n.id = descendant_node_id
                  AND public.can_manage_pm_template_node(
                      n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
                  )
            )
        )
    );

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.pm_template_nodes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pm_template_nodes TO authenticated;
GRANT ALL ON public.pm_template_nodes TO service_role;

GRANT SELECT ON public.pm_template_field_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pm_template_field_links TO authenticated;
GRANT ALL ON public.pm_template_field_links TO service_role;

GRANT SELECT ON public.pm_template_entity_assignment TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pm_template_entity_assignment TO authenticated;
GRANT ALL ON public.pm_template_entity_assignment TO service_role;

GRANT SELECT ON public.pm_template_change_notifications TO authenticated;
GRANT INSERT, UPDATE ON public.pm_template_change_notifications TO authenticated;
GRANT ALL ON public.pm_template_change_notifications TO service_role;

DO $$
BEGIN
    RAISE NOTICE 'v764b_pm_template_hierarchy_rls.sql applied';
END $$;
