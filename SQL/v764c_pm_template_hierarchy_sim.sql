-- =============================================================================
-- v764c: PM Template Hierarchy — Simulator (sim) schema mirror
-- Plan: projectplan/v764_project_management_template_hierarchy_plan.md (Phase 0)
-- Prerequisites: v764 + v764b (public), sim.custom_field_definitions (v519),
--                sim.practice_portfolios / practice_programmes / practice_projects
-- Parity: rule 34.1 — same backbone as public, scoped to sim entities
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tables (mirror of public.pm_template_*)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.pm_template_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    domain TEXT NOT NULL,
    domain_ref_id UUID NULL,
    parent_node_id UUID NULL REFERENCES sim.pm_template_nodes(id) ON DELETE SET NULL,
    scope_entity_type TEXT NULL,
    scope_entity_id UUID NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    category TEXT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    is_system_synced BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sim_pm_template_nodes_tier CHECK (
        tier IN ('pmo', 'portfolio', 'sub_portfolio', 'programme', 'project')
    ),
    CONSTRAINT chk_sim_pm_template_nodes_domain CHECK (
        domain IN ('fields', 'form_template', 'industry_plan', 'opa', 'process_template')
    ),
    CONSTRAINT chk_sim_pm_template_nodes_status CHECK (
        status IN ('draft', 'published', 'deprecated')
    ),
    CONSTRAINT chk_sim_pm_template_nodes_scope_type CHECK (
        scope_entity_type IS NULL
        OR scope_entity_type IN ('account', 'portfolio', 'sub_portfolio', 'programme', 'project')
    ),
    CONSTRAINT chk_sim_pm_template_nodes_version CHECK (version >= 1),
    CONSTRAINT chk_sim_pm_template_nodes_root_synced CHECK (
        parent_node_id IS NOT NULL OR is_system_synced = TRUE OR tier = 'pmo'
    )
);

CREATE INDEX IF NOT EXISTS idx_sim_pm_template_nodes_account
    ON sim.pm_template_nodes (account_id);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_nodes_parent
    ON sim.pm_template_nodes (parent_node_id);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_nodes_scope
    ON sim.pm_template_nodes (scope_entity_type, scope_entity_id);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_nodes_domain_tier
    ON sim.pm_template_nodes (account_id, domain, tier, is_current);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_nodes_domain_ref
    ON sim.pm_template_nodes (domain, domain_ref_id)
    WHERE domain_ref_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_pm_template_nodes_current_scope
    ON sim.pm_template_nodes (
        account_id,
        tier,
        domain,
        COALESCE(scope_entity_type, ''),
        COALESCE(scope_entity_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE is_current = TRUE;

CREATE TABLE IF NOT EXISTS sim.pm_template_field_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES sim.pm_template_nodes(id) ON DELETE CASCADE,
    custom_field_definition_id UUID NOT NULL
        REFERENCES sim.custom_field_definitions(id) ON DELETE CASCADE,
    is_local BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    required_override BOOLEAN NULL,
    default_value_override JSONB NULL,
    label_override TEXT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sim_pm_template_field_links_node_field
        UNIQUE (node_id, custom_field_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_pm_template_field_links_node
    ON sim.pm_template_field_links (node_id, display_order);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_field_links_definition
    ON sim.pm_template_field_links (custom_field_definition_id);

CREATE TABLE IF NOT EXISTS sim.pm_template_entity_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    domain TEXT NOT NULL,
    node_id UUID NULL REFERENCES sim.pm_template_nodes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sim_pm_template_entity_assignment_type CHECK (
        entity_type IN ('portfolio', 'sub_portfolio', 'programme', 'project')
    ),
    CONSTRAINT chk_sim_pm_template_entity_assignment_domain CHECK (
        domain IN ('fields', 'form_template', 'industry_plan', 'opa', 'process_template')
    ),
    CONSTRAINT uq_sim_pm_template_entity_assignment
        UNIQUE (entity_type, entity_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_sim_pm_template_entity_assignment_entity
    ON sim.pm_template_entity_assignment (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_entity_assignment_account
    ON sim.pm_template_entity_assignment (account_id, domain);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_entity_assignment_node
    ON sim.pm_template_entity_assignment (node_id)
    WHERE node_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sim.pm_template_change_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    parent_node_id UUID NOT NULL REFERENCES sim.pm_template_nodes(id) ON DELETE CASCADE,
    descendant_node_id UUID NOT NULL REFERENCES sim.pm_template_nodes(id) ON DELETE CASCADE,
    parent_version_at_notify INTEGER NOT NULL,
    message TEXT NULL,
    acknowledged_at TIMESTAMPTZ NULL,
    acknowledged_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sim_pm_template_change_notif_version CHECK (parent_version_at_notify >= 1),
    CONSTRAINT chk_sim_pm_template_change_notif_distinct CHECK (parent_node_id <> descendant_node_id)
);

CREATE INDEX IF NOT EXISTS idx_sim_pm_template_change_notif_descendant
    ON sim.pm_template_change_notifications (descendant_node_id, acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_change_notif_parent
    ON sim.pm_template_change_notifications (parent_node_id);
CREATE INDEX IF NOT EXISTS idx_sim_pm_template_change_notif_account
    ON sim.pm_template_change_notifications (account_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2) updated_at triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.trg_pm_template_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_pm_template_nodes_updated ON sim.pm_template_nodes;
CREATE TRIGGER trg_sim_pm_template_nodes_updated
    BEFORE UPDATE ON sim.pm_template_nodes
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_pm_template_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sim_pm_template_field_links_updated ON sim.pm_template_field_links;
CREATE TRIGGER trg_sim_pm_template_field_links_updated
    BEFORE UPDATE ON sim.pm_template_field_links
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_pm_template_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sim_pm_template_entity_assignment_updated ON sim.pm_template_entity_assignment;
CREATE TRIGGER trg_sim_pm_template_entity_assignment_updated
    BEFORE UPDATE ON sim.pm_template_entity_assignment
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_pm_template_touch_updated_at();

-- -----------------------------------------------------------------------------
-- 3) RLS helper + policies (sim practice entities)
-- -----------------------------------------------------------------------------
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
                AND EXISTS (
                    SELECT 1
                    FROM sim.practice_projects proj
                    LEFT JOIN public.users u ON u.id = proj.project_manager_user_id
                    WHERE proj.id = p_scope_entity_id
                      AND COALESCE(proj.is_deleted, FALSE) = FALSE
                      AND (
                          u.auth_user_id = auth.uid()
                          OR proj.user_id = auth.uid()
                          OR proj.user_id = sim.get_current_user_id()
                      )
                )
            )
        );
$$;

REVOKE ALL ON FUNCTION sim.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.can_manage_pm_template_node(UUID, TEXT, TEXT, UUID, BOOLEAN) TO service_role;

ALTER TABLE sim.pm_template_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.pm_template_field_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.pm_template_entity_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.pm_template_change_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_pm_template_nodes_select ON sim.pm_template_nodes;
CREATE POLICY sim_pm_template_nodes_select
    ON sim.pm_template_nodes
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_pm_template_nodes_insert ON sim.pm_template_nodes;
CREATE POLICY sim_pm_template_nodes_insert
    ON sim.pm_template_nodes
    FOR INSERT TO authenticated
    WITH CHECK (
        sim.can_manage_pm_template_node(
            account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
        )
    );

DROP POLICY IF EXISTS sim_pm_template_nodes_update ON sim.pm_template_nodes;
CREATE POLICY sim_pm_template_nodes_update
    ON sim.pm_template_nodes
    FOR UPDATE TO authenticated
    USING (
        sim.can_manage_pm_template_node(
            account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
        )
    )
    WITH CHECK (
        sim.can_manage_pm_template_node(
            account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
        )
    );

DROP POLICY IF EXISTS sim_pm_template_nodes_delete ON sim.pm_template_nodes;
CREATE POLICY sim_pm_template_nodes_delete
    ON sim.pm_template_nodes
    FOR DELETE TO authenticated
    USING (
        sim.can_manage_pm_template_node(
            account_id, tier, scope_entity_type, scope_entity_id, is_system_synced
        )
    );

DROP POLICY IF EXISTS sim_pm_template_field_links_select ON sim.pm_template_field_links;
CREATE POLICY sim_pm_template_field_links_select
    ON sim.pm_template_field_links
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = pm_template_field_links.node_id
              AND public.user_has_access_to_account(n.account_id)
        )
    );

DROP POLICY IF EXISTS sim_pm_template_field_links_write ON sim.pm_template_field_links;
CREATE POLICY sim_pm_template_field_links_write
    ON sim.pm_template_field_links
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = pm_template_field_links.node_id
              AND sim.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = pm_template_field_links.node_id
              AND sim.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    );

DROP POLICY IF EXISTS sim_pm_template_entity_assignment_select ON sim.pm_template_entity_assignment;
CREATE POLICY sim_pm_template_entity_assignment_select
    ON sim.pm_template_entity_assignment
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_pm_template_entity_assignment_write ON sim.pm_template_entity_assignment;
CREATE POLICY sim_pm_template_entity_assignment_write
    ON sim.pm_template_entity_assignment
    FOR ALL TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.is_pmo_admin_user()
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.is_pmo_admin_user()
        )
    );

DROP POLICY IF EXISTS sim_pm_template_change_notifications_select ON sim.pm_template_change_notifications;
CREATE POLICY sim_pm_template_change_notifications_select
    ON sim.pm_template_change_notifications
    FOR SELECT TO authenticated
    USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_pm_template_change_notifications_update ON sim.pm_template_change_notifications;
CREATE POLICY sim_pm_template_change_notifications_update
    ON sim.pm_template_change_notifications
    FOR UPDATE TO authenticated
    USING (public.user_has_access_to_account(account_id))
    WITH CHECK (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS sim_pm_template_change_notifications_insert ON sim.pm_template_change_notifications;
CREATE POLICY sim_pm_template_change_notifications_insert
    ON sim.pm_template_change_notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.is_pmo_admin_user()
        )
    );

GRANT SELECT ON sim.pm_template_nodes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.pm_template_nodes TO authenticated;
GRANT ALL ON sim.pm_template_nodes TO service_role;

GRANT SELECT ON sim.pm_template_field_links TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.pm_template_field_links TO authenticated;
GRANT ALL ON sim.pm_template_field_links TO service_role;

GRANT SELECT ON sim.pm_template_entity_assignment TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.pm_template_entity_assignment TO authenticated;
GRANT ALL ON sim.pm_template_entity_assignment TO service_role;

GRANT SELECT ON sim.pm_template_change_notifications TO authenticated;
GRANT INSERT, UPDATE ON sim.pm_template_change_notifications TO authenticated;
GRANT ALL ON sim.pm_template_change_notifications TO service_role;

DO $$
BEGIN
    RAISE NOTICE 'v764c_pm_template_hierarchy_sim.sql applied';
END $$;
