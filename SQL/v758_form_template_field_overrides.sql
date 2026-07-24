-- ============================================================================
-- v758: Per-organisation form template field enable/disable overrides
-- Platform (public) + Simulator (sim) — companion to v756 template field governance
-- No row = field enabled (default-on). Rows exist only when a PMO disables a field.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.form_template_field_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, template_id, section_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_form_template_field_overrides_org_template
    ON public.form_template_field_overrides (organisation_id, template_id);

CREATE TABLE IF NOT EXISTS sim.form_template_field_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES sim.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, template_id, section_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_sim_form_template_field_overrides_org_template
    ON sim.form_template_field_overrides (organisation_id, template_id);

ALTER TABLE public.form_template_field_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_template_field_overrides ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user with access to the organisation (PM consumption + PMO toggles)
DROP POLICY IF EXISTS policy_form_template_field_overrides_select ON public.form_template_field_overrides;
CREATE POLICY policy_form_template_field_overrides_select
    ON public.form_template_field_overrides
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS policy_sim_form_template_field_overrides_select ON sim.form_template_field_overrides;
CREATE POLICY policy_sim_form_template_field_overrides_select
    ON sim.form_template_field_overrides
    FOR SELECT
    TO authenticated
    USING (public.user_has_access_to_account(organisation_id));

-- INSERT/UPDATE: PMO suite admins with access to that organisation only
DROP POLICY IF EXISTS policy_form_template_field_overrides_pmo_write ON public.form_template_field_overrides;
CREATE POLICY policy_form_template_field_overrides_pmo_write
    ON public.form_template_field_overrides
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

DROP POLICY IF EXISTS policy_sim_form_template_field_overrides_pmo_write ON sim.form_template_field_overrides;
CREATE POLICY policy_sim_form_template_field_overrides_pmo_write
    ON sim.form_template_field_overrides
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

GRANT SELECT ON public.form_template_field_overrides TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.form_template_field_overrides TO authenticated;
GRANT ALL ON public.form_template_field_overrides TO service_role;

GRANT SELECT ON sim.form_template_field_overrides TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.form_template_field_overrides TO authenticated;
GRANT ALL ON sim.form_template_field_overrides TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_template_field_overrides', 'Per-organisation enable/disable overrides for shared form template fields (Platform).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.form_template_field_overrides', 'Per-organisation enable/disable overrides for shared form template fields (Simulator sim schema).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v758_form_template_field_overrides.sql applied';
END $$;
