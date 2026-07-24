-- ============================================================================
-- Fix Form Template RLS Policies (Platform + Simulator)
-- Version: v753
-- Description: form_templates / form_template_versions had RLS enabled
--   (v502_form_engine_tables.sql, v503_form_engine_sim.sql) but no policies
--   or grants were ever created, so PostgREST returns zero rows to
--   authenticated users regardless of seeded data. Same root cause as
--   v126_fix_countries_rls_policies.sql.
--
-- Scope: read access to the template library only (global reference data,
-- shared across all organisations/projects — no owning org/project column
-- on these tables). Write access for admin management is deferred to a
-- follow-up migration once the create/edit template UI exists.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public schema (Platform)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS policy_form_templates_select_authenticated ON public.form_templates;
DROP POLICY IF EXISTS policy_form_template_versions_select_authenticated ON public.form_template_versions;

CREATE POLICY policy_form_templates_select_authenticated
    ON public.form_templates
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

CREATE POLICY policy_form_template_versions_select_authenticated
    ON public.form_template_versions
    FOR SELECT
    TO authenticated
    USING (TRUE);

GRANT SELECT ON public.form_templates TO authenticated;
GRANT SELECT ON public.form_template_versions TO authenticated;
GRANT ALL ON public.form_templates TO service_role;
GRANT ALL ON public.form_template_versions TO service_role;

-- ----------------------------------------------------------------------------
-- sim schema (Simulator) — parity with public schema (rule 34.1)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS policy_sim_form_templates_select_authenticated ON sim.form_templates;
DROP POLICY IF EXISTS policy_sim_form_template_versions_select_authenticated ON sim.form_template_versions;

CREATE POLICY policy_sim_form_templates_select_authenticated
    ON sim.form_templates
    FOR SELECT
    TO authenticated
    USING (is_active = TRUE);

CREATE POLICY policy_sim_form_template_versions_select_authenticated
    ON sim.form_template_versions
    FOR SELECT
    TO authenticated
    USING (TRUE);

GRANT SELECT ON sim.form_templates TO authenticated;
GRANT SELECT ON sim.form_template_versions TO authenticated;
GRANT ALL ON sim.form_templates TO service_role;
GRANT ALL ON sim.form_template_versions TO service_role;

-- ----------------------------------------------------------------------------
-- Verification
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_public_templates INTEGER;
    v_public_policies INTEGER;
    v_sim_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_public_templates FROM public.form_templates;

    SELECT COUNT(*) INTO v_public_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('form_templates', 'form_template_versions');

    SELECT COUNT(*) INTO v_sim_policies
    FROM pg_policies
    WHERE schemaname = 'sim' AND tablename IN ('form_templates', 'form_template_versions');

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Form Template RLS Fix Complete';
    RAISE NOTICE 'public.form_templates rows: %', v_public_templates;
    RAISE NOTICE 'public schema policies created: %', v_public_policies;
    RAISE NOTICE 'sim schema policies created: %', v_sim_policies;
    RAISE NOTICE '================================================';

    IF v_public_templates = 0 THEN
        RAISE WARNING 'public.form_templates is empty — also run SQL/v506_form_template_seeds.sql';
    END IF;
END $$;
