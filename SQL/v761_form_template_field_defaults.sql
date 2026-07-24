-- ============================================================================
-- v761: Per-organisation form template default content
-- Platform (public) + Simulator (sim)
-- No row = no pre-filled value. Defaults apply only when creating new instances.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.form_template_field_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    default_value JSONB NOT NULL DEFAULT 'null'::jsonb,
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, template_id, section_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_form_template_field_defaults_org_template
    ON public.form_template_field_defaults (organisation_id, template_id);

CREATE TABLE IF NOT EXISTS sim.form_template_field_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES sim.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    default_value JSONB NOT NULL DEFAULT 'null'::jsonb,
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, template_id, section_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_sim_form_template_field_defaults_org_template
    ON sim.form_template_field_defaults (organisation_id, template_id);

ALTER TABLE public.form_template_field_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_template_field_defaults ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user with access to the organisation (PM consumption + PMO editing).
DROP POLICY IF EXISTS policy_form_template_field_defaults_select ON public.form_template_field_defaults;
CREATE POLICY policy_form_template_field_defaults_select
    ON public.form_template_field_defaults
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS policy_sim_form_template_field_defaults_select ON sim.form_template_field_defaults;
CREATE POLICY policy_sim_form_template_field_defaults_select
    ON sim.form_template_field_defaults
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(organisation_id));

-- INSERT/UPDATE/DELETE: PMO suite admins with access to that organisation only.
DROP POLICY IF EXISTS policy_form_template_field_defaults_pmo_write ON public.form_template_field_defaults;
CREATE POLICY policy_form_template_field_defaults_pmo_write
    ON public.form_template_field_defaults
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

DROP POLICY IF EXISTS policy_sim_form_template_field_defaults_pmo_write ON sim.form_template_field_defaults;
CREATE POLICY policy_sim_form_template_field_defaults_pmo_write
    ON sim.form_template_field_defaults
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

GRANT SELECT ON public.form_template_field_defaults TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.form_template_field_defaults TO authenticated;
GRANT ALL ON public.form_template_field_defaults TO service_role;

GRANT SELECT ON sim.form_template_field_defaults TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.form_template_field_defaults TO authenticated;
GRANT ALL ON sim.form_template_field_defaults TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_template_field_defaults', 'Per-organisation default pre-fill values for shared form template fields (Platform).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.form_template_field_defaults', 'Per-organisation default pre-fill values for shared form template fields (Simulator sim schema).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v761_form_template_field_defaults.sql applied';
END $$;
