-- ============================================================================
-- v762: Multi-language field labels — reference data + translations
-- Platform (public) + Simulator (sim)
-- Companion plan: projectplan/v762_multi_language_field_labels_plan.md
--
-- languages: global reference list of display languages (mirrors countries
--   table conventions — code/name/is_active/audit columns, rule 15 pattern).
-- form_field_translations: PMO-authored translated labels/option-labels per
--   template field, keyed by (template_id, section_key, field_key,
--   language_code). Same sharing model as form_templates itself — global
--   catalog data, not organisation-scoped (mirrors v753/v754 read/write RLS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public schema (Platform)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.languages (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    native_name TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.form_field_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    language_code TEXT NOT NULL REFERENCES public.languages(code) ON DELETE CASCADE,
    label TEXT NULL,
    option_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE (template_id, section_key, field_key, language_code)
);

CREATE INDEX IF NOT EXISTS idx_form_field_translations_template
    ON public.form_field_translations (template_id, language_code);

-- ----------------------------------------------------------------------------
-- sim schema (Simulator) — parity with public schema (rule 34.1)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sim.languages (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    native_name TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ NULL,
    deleted_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sim.form_field_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES sim.form_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    field_key TEXT NOT NULL,
    language_code TEXT NOT NULL REFERENCES sim.languages(code) ON DELETE CASCADE,
    label TEXT NULL,
    option_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE (template_id, section_key, field_key, language_code)
);

CREATE INDEX IF NOT EXISTS idx_sim_form_field_translations_template
    ON sim.form_field_translations (template_id, language_code);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.form_field_translations ENABLE ROW LEVEL SECURITY;

-- languages: readable by anyone (incl. anon, for pre-auth language pick),
-- writable only by System Admin/Superuser — mirrors v126_fix_countries_rls_policies.sql.
DROP POLICY IF EXISTS policy_languages_select_authenticated ON public.languages;
DROP POLICY IF EXISTS policy_languages_select_public ON public.languages;
DROP POLICY IF EXISTS policy_languages_admin_all ON public.languages;

CREATE POLICY policy_languages_select_authenticated
    ON public.languages
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_languages_select_public
    ON public.languages
    FOR SELECT
    TO anon
    USING (is_deleted = FALSE);

CREATE POLICY policy_languages_admin_all
    ON public.languages
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND u.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND u.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_sim_languages_select_authenticated ON sim.languages;
DROP POLICY IF EXISTS policy_sim_languages_select_public ON sim.languages;
DROP POLICY IF EXISTS policy_sim_languages_admin_all ON sim.languages;

CREATE POLICY policy_sim_languages_select_authenticated
    ON sim.languages
    FOR SELECT
    TO authenticated
    USING (is_deleted = FALSE);

CREATE POLICY policy_sim_languages_select_public
    ON sim.languages
    FOR SELECT
    TO anon
    USING (is_deleted = FALSE);

CREATE POLICY policy_sim_languages_admin_all
    ON sim.languages
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND u.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM user_roles ur
            INNER JOIN roles r ON ur.role_id = r.id
            INNER JOIN users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('System Admin', 'Superuser')
            AND ur.is_deleted = FALSE
            AND r.is_deleted = FALSE
            AND u.is_deleted = FALSE
        )
    );

-- form_field_translations: same sharing model as form_templates — readable by
-- any authenticated user, writable only by PMO admins (mirrors v754).
DROP POLICY IF EXISTS policy_form_field_translations_select ON public.form_field_translations;
DROP POLICY IF EXISTS policy_form_field_translations_pmo_write ON public.form_field_translations;

CREATE POLICY policy_form_field_translations_select
    ON public.form_field_translations
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY policy_form_field_translations_pmo_write
    ON public.form_field_translations
    FOR ALL
    TO authenticated
    USING (public.is_user_pmo_admin(auth.uid()))
    WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_sim_form_field_translations_select ON sim.form_field_translations;
DROP POLICY IF EXISTS policy_sim_form_field_translations_pmo_write ON sim.form_field_translations;

CREATE POLICY policy_sim_form_field_translations_select
    ON sim.form_field_translations
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY policy_sim_form_field_translations_pmo_write
    ON sim.form_field_translations
    FOR ALL
    TO authenticated
    USING (public.is_user_pmo_admin(auth.uid()))
    WITH CHECK (public.is_user_pmo_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------

GRANT SELECT ON public.languages TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.languages TO authenticated;
GRANT ALL ON public.languages TO service_role;

GRANT SELECT ON public.form_field_translations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.form_field_translations TO authenticated;
GRANT ALL ON public.form_field_translations TO service_role;

GRANT SELECT ON sim.languages TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON sim.languages TO authenticated;
GRANT ALL ON sim.languages TO service_role;

GRANT SELECT ON sim.form_field_translations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.form_field_translations TO authenticated;
GRANT ALL ON sim.form_field_translations TO service_role;

-- ----------------------------------------------------------------------------
-- database_tables registration
-- ----------------------------------------------------------------------------

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('languages', 'Global reference list of display languages available for the language switcher (Platform).', false, true),
    ('form_field_translations', 'PMO-authored translated field labels and select-option labels per form template (Platform).', false, true),
    ('sim.languages', 'Global reference list of display languages available for the language switcher (Simulator sim schema).', false, true),
    ('sim.form_field_translations', 'PMO-authored translated field labels and select-option labels per form template (Simulator sim schema).', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v762_multi_language_tables.sql applied';
END $$;
