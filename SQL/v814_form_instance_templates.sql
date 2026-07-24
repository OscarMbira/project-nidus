-- =============================================================================
-- v814: Completed example instances — any tier authors, its descendants copy
-- Plan: projectplan/v808_form_template_org_required_field_override_plan.md (Phase 7, decisions 14-17)
-- Prerequisites: v764b (can_manage_pm_template_node), v812 (tier scope columns/pattern)
--
-- `values`/`rows` are stored as the same flat JSONB shapes FormNew.jsx/FormEdit.jsx already
-- hold in memory ({ field_key: value }, { section_key: [row, ...] }) — copying into a real
-- form_instances row is then a straight call into the existing updateFormValues/updateFormRows,
-- not a format conversion (decision 14).
--
-- scope_entity_type/scope_entity_id stay genuinely NULLABLE here (unlike v812's sentinel
-- convention) — there is no uniqueness constraint on them; a tier can publish any number of
-- named examples for the same template, so there's no NULL-vs-sentinel upsert conflict to avoid.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.form_instance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    scope_entity_type TEXT NULL,
    scope_entity_id UUID NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    values JSONB NOT NULL DEFAULT '{}'::JSONB,
    rows JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_form_instance_templates_scope_type CHECK (
        scope_entity_type IS NULL OR scope_entity_type IN ('portfolio', 'programme', 'project')
    )
);

COMMENT ON TABLE public.form_instance_templates IS
    'Fully-filled reference examples any tier can author for a shared form template — descendants copy one as their starting point instead of a blank form (not a real form_instances row: no project, no owner, no workflow status).';

CREATE INDEX IF NOT EXISTS idx_form_instance_templates_org_template
    ON public.form_instance_templates (organisation_id, template_id);
CREATE INDEX IF NOT EXISTS idx_form_instance_templates_scope
    ON public.form_instance_templates (scope_entity_type, scope_entity_id)
    WHERE scope_entity_type IS NOT NULL;

CREATE TABLE IF NOT EXISTS sim.form_instance_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES sim.form_templates(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    scope_entity_type TEXT NULL,
    scope_entity_id UUID NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    values JSONB NOT NULL DEFAULT '{}'::JSONB,
    rows JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sim_form_instance_templates_scope_type CHECK (
        scope_entity_type IS NULL OR scope_entity_type IN ('portfolio', 'programme', 'project')
    )
);

CREATE INDEX IF NOT EXISTS idx_sim_form_instance_templates_org_template
    ON sim.form_instance_templates (organisation_id, template_id);
CREATE INDEX IF NOT EXISTS idx_sim_form_instance_templates_scope
    ON sim.form_instance_templates (scope_entity_type, scope_entity_id)
    WHERE scope_entity_type IS NOT NULL;

ALTER TABLE public.form_instance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_instance_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: open to anyone with access to the organisation (same as form_template_field_overrides) —
-- a descendant tier needs to be able to see and copy an ancestor's published example.
DROP POLICY IF EXISTS policy_form_instance_templates_select ON public.form_instance_templates;
CREATE POLICY policy_form_instance_templates_select
    ON public.form_instance_templates
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS policy_sim_form_instance_templates_select ON sim.form_instance_templates;
CREATE POLICY policy_sim_form_instance_templates_select
    ON sim.form_instance_templates
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(organisation_id));

-- INSERT/UPDATE/DELETE: PMO admin for org-wide (scope_entity_type IS NULL) rows, or the matching
-- tier manager for their own scoped rows — mirrors can_manage_pm_template_node (v764b) exactly,
-- no new access model (decision 15). No usage-gate on delete (decision 17).
DROP POLICY IF EXISTS policy_form_instance_templates_write ON public.form_instance_templates;
CREATE POLICY policy_form_instance_templates_write
    ON public.form_instance_templates
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR (
                scope_entity_type IS NOT NULL
                AND public.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
            )
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR (
                scope_entity_type IS NOT NULL
                AND public.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
            )
        )
    );

DROP POLICY IF EXISTS policy_sim_form_instance_templates_write ON sim.form_instance_templates;
CREATE POLICY policy_sim_form_instance_templates_write
    ON sim.form_instance_templates
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR (
                scope_entity_type IS NOT NULL
                AND sim.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
            )
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR (
                scope_entity_type IS NOT NULL
                AND sim.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
            )
        )
    );

GRANT SELECT ON public.form_instance_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.form_instance_templates TO authenticated;
GRANT ALL ON public.form_instance_templates TO service_role;

GRANT SELECT ON sim.form_instance_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.form_instance_templates TO authenticated;
GRANT ALL ON sim.form_instance_templates TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_instance_templates', 'Completed example form instances any tier authors for its descendants to copy (Platform).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.form_instance_templates', 'Completed example form instances any tier authors for its descendants to copy (Simulator sim schema).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v814_form_instance_templates.sql applied';
END $$;
