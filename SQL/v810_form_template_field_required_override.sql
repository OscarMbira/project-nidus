-- =============================================================================
-- v810: Per-organisation required-field override + org-added local fields
-- Plan: projectplan/v808_form_template_org_required_field_override_plan.md (Phase 1 + 1b)
-- Prerequisites: v758 (form_template_field_overrides), v756 (id generation helpers, unrelated but same account model)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Phase 1: required override column on the existing enable/disable table
-- NULL = inherit the master schema's own field.required; TRUE/FALSE = explicit override.
-- -----------------------------------------------------------------------------
ALTER TABLE public.form_template_field_overrides
    ADD COLUMN IF NOT EXISTS is_required BOOLEAN NULL;

ALTER TABLE sim.form_template_field_overrides
    ADD COLUMN IF NOT EXISTS is_required BOOLEAN NULL;

COMMENT ON COLUMN public.form_template_field_overrides.is_required IS
    'NULL = inherit master schema field.required; TRUE/FALSE = explicit per-organisation override.';
COMMENT ON COLUMN sim.form_template_field_overrides.is_required IS
    'NULL = inherit master schema field.required; TRUE/FALSE = explicit per-organisation override.';

-- -----------------------------------------------------------------------------
-- Phase 1b: org-added local fields (fields that don't exist in the master schema)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.form_template_field_additions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_definition JSONB NOT NULL,
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, template_id, section_key, field_key)
);

COMMENT ON TABLE public.form_template_field_additions IS
    'Org-local fields appended to a shared form_template schema — not present in the master schema at all.';
COMMENT ON COLUMN public.form_template_field_additions.field_definition IS
    'Same shape as a master-schema field: { key, label, type, required, options }.';

CREATE INDEX IF NOT EXISTS idx_form_template_field_additions_org_template
    ON public.form_template_field_additions (organisation_id, template_id);

CREATE TABLE IF NOT EXISTS sim.form_template_field_additions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES sim.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    field_definition JSONB NOT NULL,
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, template_id, section_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_sim_form_template_field_additions_org_template
    ON sim.form_template_field_additions (organisation_id, template_id);

ALTER TABLE public.form_template_field_additions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_template_field_additions ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user with access to the organisation (PM consumption + PMO authoring)
DROP POLICY IF EXISTS policy_form_template_field_additions_select ON public.form_template_field_additions;
CREATE POLICY policy_form_template_field_additions_select
    ON public.form_template_field_additions
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS policy_sim_form_template_field_additions_select ON sim.form_template_field_additions;
CREATE POLICY policy_sim_form_template_field_additions_select
    ON sim.form_template_field_additions
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(organisation_id));

-- INSERT/UPDATE/DELETE: PMO suite admins with access to that organisation only
DROP POLICY IF EXISTS policy_form_template_field_additions_pmo_write ON public.form_template_field_additions;
CREATE POLICY policy_form_template_field_additions_pmo_write
    ON public.form_template_field_additions
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(organisation_id)
        AND public.is_user_pmo_admin(auth.uid())
    )
    WITH CHECK (
        public.user_has_access_to_account(organisation_id)
        AND public.is_user_pmo_admin(auth.uid())
    );

DROP POLICY IF EXISTS policy_sim_form_template_field_additions_pmo_write ON sim.form_template_field_additions;
CREATE POLICY policy_sim_form_template_field_additions_pmo_write
    ON sim.form_template_field_additions
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(organisation_id)
        AND public.is_user_pmo_admin(auth.uid())
    )
    WITH CHECK (
        public.user_has_access_to_account(organisation_id)
        AND public.is_user_pmo_admin(auth.uid())
    );

GRANT SELECT ON public.form_template_field_additions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.form_template_field_additions TO authenticated;
GRANT ALL ON public.form_template_field_additions TO service_role;

GRANT SELECT ON sim.form_template_field_additions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.form_template_field_additions TO authenticated;
GRANT ALL ON sim.form_template_field_additions TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_template_field_additions', 'Per-organisation locally-added fields appended to a shared form template schema (Platform).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.form_template_field_additions', 'Per-organisation locally-added fields appended to a shared form template schema (Simulator sim schema).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v810_form_template_field_required_override.sql applied';
END $$;
