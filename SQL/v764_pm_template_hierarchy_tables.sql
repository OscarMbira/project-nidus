-- =============================================================================
-- v764: Project Management Template Hierarchy — backbone tables (public)
-- Plan: projectplan/v764_project_management_template_hierarchy_plan.md (Phase 0)
--
-- Adds a generic Global→PMO→Portfolio→Sub-Portfolio→Programme→Project backbone.
-- Existing template subsystems attach later via nullable FKs (Phase 3).
-- Prerequisites: public.accounts, public.users, public.custom_field_definitions (v515)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) pm_template_nodes — inheritance tree nodes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_template_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    domain TEXT NOT NULL,
    domain_ref_id UUID NULL,
    parent_node_id UUID NULL REFERENCES public.pm_template_nodes(id) ON DELETE SET NULL,
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
    CONSTRAINT chk_pm_template_nodes_tier CHECK (
        tier IN ('pmo', 'portfolio', 'sub_portfolio', 'programme', 'project')
    ),
    CONSTRAINT chk_pm_template_nodes_domain CHECK (
        domain IN ('fields', 'form_template', 'industry_plan', 'opa', 'process_template')
    ),
    CONSTRAINT chk_pm_template_nodes_status CHECK (
        status IN ('draft', 'published', 'deprecated')
    ),
    CONSTRAINT chk_pm_template_nodes_scope_type CHECK (
        scope_entity_type IS NULL
        OR scope_entity_type IN ('account', 'portfolio', 'sub_portfolio', 'programme', 'project')
    ),
    CONSTRAINT chk_pm_template_nodes_version CHECK (version >= 1),
    CONSTRAINT chk_pm_template_nodes_root_synced CHECK (
        parent_node_id IS NOT NULL OR is_system_synced = TRUE OR tier = 'pmo'
    )
);

COMMENT ON TABLE public.pm_template_nodes IS
    'PM template hierarchy backbone: PMO/Portfolio/Programme/Project nodes (Global synced rows use is_system_synced).';
COMMENT ON COLUMN public.pm_template_nodes.domain_ref_id IS
    'FK-like pointer to domain master row (form_templates, industry templates, OPA, etc.); NULL for domain=fields.';
COMMENT ON COLUMN public.pm_template_nodes.is_system_synced IS
    'TRUE for rows written by Admin Global Template sync — read-only in Platform/Simulator UI.';

CREATE INDEX IF NOT EXISTS idx_pm_template_nodes_account
    ON public.pm_template_nodes (account_id);
CREATE INDEX IF NOT EXISTS idx_pm_template_nodes_parent
    ON public.pm_template_nodes (parent_node_id);
CREATE INDEX IF NOT EXISTS idx_pm_template_nodes_scope
    ON public.pm_template_nodes (scope_entity_type, scope_entity_id);
CREATE INDEX IF NOT EXISTS idx_pm_template_nodes_domain_tier
    ON public.pm_template_nodes (account_id, domain, tier, is_current);
CREATE INDEX IF NOT EXISTS idx_pm_template_nodes_domain_ref
    ON public.pm_template_nodes (domain, domain_ref_id)
    WHERE domain_ref_id IS NOT NULL;

-- At most one current node per account/tier/domain/scope combo
CREATE UNIQUE INDEX IF NOT EXISTS uq_pm_template_nodes_current_scope
    ON public.pm_template_nodes (
        account_id,
        tier,
        domain,
        COALESCE(scope_entity_type, ''),
        COALESCE(scope_entity_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
    WHERE is_current = TRUE;

-- -----------------------------------------------------------------------------
-- 2) pm_template_field_links — fields domain attachments + tier overrides
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_template_field_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES public.pm_template_nodes(id) ON DELETE CASCADE,
    custom_field_definition_id UUID NOT NULL
        REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
    is_local BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    required_override BOOLEAN NULL,
    default_value_override JSONB NULL,
    label_override TEXT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pm_template_field_links_node_field
        UNIQUE (node_id, custom_field_definition_id)
);

COMMENT ON TABLE public.pm_template_field_links IS
    'Links custom_field_definitions to a pm_template_nodes row with optional per-tier overrides.';

CREATE INDEX IF NOT EXISTS idx_pm_template_field_links_node
    ON public.pm_template_field_links (node_id, display_order);
CREATE INDEX IF NOT EXISTS idx_pm_template_field_links_definition
    ON public.pm_template_field_links (custom_field_definition_id);

-- -----------------------------------------------------------------------------
-- 3) pm_template_entity_assignment — entity → resolved node
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_template_entity_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    domain TEXT NOT NULL,
    node_id UUID NULL REFERENCES public.pm_template_nodes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pm_template_entity_assignment_type CHECK (
        entity_type IN ('portfolio', 'sub_portfolio', 'programme', 'project')
    ),
    CONSTRAINT chk_pm_template_entity_assignment_domain CHECK (
        domain IN ('fields', 'form_template', 'industry_plan', 'opa', 'process_template')
    ),
    CONSTRAINT uq_pm_template_entity_assignment
        UNIQUE (entity_type, entity_id, domain)
);

COMMENT ON TABLE public.pm_template_entity_assignment IS
    'Which template node an entity resolves against; NULL node_id means walk nearest ancestor default.';
COMMENT ON COLUMN public.pm_template_entity_assignment.node_id IS
    'Explicit fork node; NULL → inheritance resolver walks nearest ancestor default.';

CREATE INDEX IF NOT EXISTS idx_pm_template_entity_assignment_entity
    ON public.pm_template_entity_assignment (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pm_template_entity_assignment_account
    ON public.pm_template_entity_assignment (account_id, domain);
CREATE INDEX IF NOT EXISTS idx_pm_template_entity_assignment_node
    ON public.pm_template_entity_assignment (node_id)
    WHERE node_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4) pm_template_change_notifications — parent published → descendant review
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pm_template_change_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    parent_node_id UUID NOT NULL REFERENCES public.pm_template_nodes(id) ON DELETE CASCADE,
    descendant_node_id UUID NOT NULL REFERENCES public.pm_template_nodes(id) ON DELETE CASCADE,
    parent_version_at_notify INTEGER NOT NULL,
    message TEXT NULL,
    acknowledged_at TIMESTAMPTZ NULL,
    acknowledged_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_pm_template_change_notif_version CHECK (parent_version_at_notify >= 1),
    CONSTRAINT chk_pm_template_change_notif_distinct CHECK (parent_node_id <> descendant_node_id)
);

COMMENT ON TABLE public.pm_template_change_notifications IS
    'Node-to-node drift notifications when a parent template publishes a new version.';

CREATE INDEX IF NOT EXISTS idx_pm_template_change_notif_descendant
    ON public.pm_template_change_notifications (descendant_node_id, acknowledged_at);
CREATE INDEX IF NOT EXISTS idx_pm_template_change_notif_parent
    ON public.pm_template_change_notifications (parent_node_id);
CREATE INDEX IF NOT EXISTS idx_pm_template_change_notif_account
    ON public.pm_template_change_notifications (account_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 5) updated_at touch triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_pm_template_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pm_template_nodes_updated ON public.pm_template_nodes;
CREATE TRIGGER trg_pm_template_nodes_updated
    BEFORE UPDATE ON public.pm_template_nodes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_pm_template_touch_updated_at();

DROP TRIGGER IF EXISTS trg_pm_template_field_links_updated ON public.pm_template_field_links;
CREATE TRIGGER trg_pm_template_field_links_updated
    BEFORE UPDATE ON public.pm_template_field_links
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_pm_template_touch_updated_at();

DROP TRIGGER IF EXISTS trg_pm_template_entity_assignment_updated ON public.pm_template_entity_assignment;
CREATE TRIGGER trg_pm_template_entity_assignment_updated
    BEFORE UPDATE ON public.pm_template_entity_assignment
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_pm_template_touch_updated_at();

DO $$
BEGIN
    RAISE NOTICE 'v764_pm_template_hierarchy_tables.sql applied';
END $$;
