-- =============================================================================
-- v766: PM Template Hierarchy — Phase 3 document-domain additive FKs
-- Plan: projectplan/v767_pm_template_documents_domain_plan.md (formerly v766 in roadmap)
-- Adds nullable pm_template_node_id on existing document masters + process hub join.
-- Prerequisites: v764 / v764c, form_templates, pmo_industry_templates,
--                organisational_process_assets
-- =============================================================================

-- Platform
ALTER TABLE public.form_templates
    ADD COLUMN IF NOT EXISTS pm_template_node_id UUID NULL
        REFERENCES public.pm_template_nodes(id) ON DELETE SET NULL;

ALTER TABLE public.pmo_industry_templates
    ADD COLUMN IF NOT EXISTS pm_template_node_id UUID NULL
        REFERENCES public.pm_template_nodes(id) ON DELETE SET NULL;

ALTER TABLE public.organisational_process_assets
    ADD COLUMN IF NOT EXISTS pm_template_node_id UUID NULL
        REFERENCES public.pm_template_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_form_templates_pm_node
    ON public.form_templates (pm_template_node_id)
    WHERE pm_template_node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pmo_industry_templates_pm_node
    ON public.pmo_industry_templates (pm_template_node_id)
    WHERE pm_template_node_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opa_pm_node
    ON public.organisational_process_assets (pm_template_node_id)
    WHERE pm_template_node_id IS NOT NULL;

-- Process Templates Hub: single join table (avoids altering ~24 tables)
CREATE TABLE IF NOT EXISTS public.process_template_node_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_table TEXT NOT NULL,
    document_id UUID NOT NULL,
    node_id UUID NOT NULL REFERENCES public.pm_template_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_process_template_node_links UNIQUE (document_table, document_id)
);

CREATE INDEX IF NOT EXISTS idx_process_template_node_links_node
    ON public.process_template_node_links (node_id);

ALTER TABLE public.process_template_node_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS process_template_node_links_select ON public.process_template_node_links;
CREATE POLICY process_template_node_links_select
    ON public.process_template_node_links
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = process_template_node_links.node_id
              AND public.user_has_access_to_account(n.account_id)
        )
    );

DROP POLICY IF EXISTS process_template_node_links_write ON public.process_template_node_links;
CREATE POLICY process_template_node_links_write
    ON public.process_template_node_links
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = process_template_node_links.node_id
              AND public.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = process_template_node_links.node_id
              AND public.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_template_node_links TO authenticated;
GRANT ALL ON public.process_template_node_links TO service_role;

-- Simulator mirrors
ALTER TABLE sim.form_templates
    ADD COLUMN IF NOT EXISTS pm_template_node_id UUID NULL
        REFERENCES sim.pm_template_nodes(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sim' AND table_name = 'pmo_industry_templates'
    ) THEN
        EXECUTE 'ALTER TABLE sim.pmo_industry_templates
                 ADD COLUMN IF NOT EXISTS pm_template_node_id UUID NULL
                 REFERENCES sim.pm_template_nodes(id) ON DELETE SET NULL';
    END IF;
END $$;

ALTER TABLE sim.organisational_process_assets
    ADD COLUMN IF NOT EXISTS pm_template_node_id UUID NULL
        REFERENCES sim.pm_template_nodes(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS sim.process_template_node_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_table TEXT NOT NULL,
    document_id UUID NOT NULL,
    node_id UUID NOT NULL REFERENCES sim.pm_template_nodes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sim_process_template_node_links UNIQUE (document_table, document_id)
);

ALTER TABLE sim.process_template_node_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_process_template_node_links_select ON sim.process_template_node_links;
CREATE POLICY sim_process_template_node_links_select
    ON sim.process_template_node_links
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = process_template_node_links.node_id
              AND public.user_has_access_to_account(n.account_id)
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.process_template_node_links TO authenticated;
GRANT ALL ON sim.process_template_node_links TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('process_template_node_links', 'Join table linking Process Templates Hub documents to pm_template_nodes.', false, true),
    ('sim.process_template_node_links', 'Simulator mirror of process_template_node_links.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'v766_pm_template_document_links.sql applied';
END $$;
