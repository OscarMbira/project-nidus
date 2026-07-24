-- ============================================================================
-- PMO Form Template Builder — Admin RLS (Platform + Simulator)
-- Version: v754
-- Description: Extend v753 SELECT policies so PMO admins can see draft
--   templates (is_active = false). Add INSERT/UPDATE policies gated by
--   public.is_user_pmo_admin(auth.uid()) for form_templates and
--   form_template_versions in public and sim schemas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public schema (Platform)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS policy_form_templates_select_authenticated ON public.form_templates;
DROP POLICY IF EXISTS policy_form_template_versions_select_authenticated ON public.form_template_versions;
DROP POLICY IF EXISTS policy_form_templates_pmo_admin_write ON public.form_templates;
DROP POLICY IF EXISTS policy_form_template_versions_pmo_admin_write ON public.form_template_versions;

CREATE POLICY policy_form_templates_select_authenticated
    ON public.form_templates
    FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        OR public.is_user_pmo_admin(auth.uid())
    );

CREATE POLICY policy_form_template_versions_select_authenticated
    ON public.form_template_versions
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY policy_form_templates_pmo_admin_write
    ON public.form_templates
    FOR ALL
    TO authenticated
    USING (public.is_user_pmo_admin(auth.uid()))
    WITH CHECK (public.is_user_pmo_admin(auth.uid()));

CREATE POLICY policy_form_template_versions_pmo_admin_write
    ON public.form_template_versions
    FOR ALL
    TO authenticated
    USING (public.is_user_pmo_admin(auth.uid()))
    WITH CHECK (public.is_user_pmo_admin(auth.uid()));

GRANT SELECT ON public.form_templates TO authenticated;
GRANT SELECT ON public.form_template_versions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.form_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.form_template_versions TO authenticated;
GRANT ALL ON public.form_templates TO service_role;
GRANT ALL ON public.form_template_versions TO service_role;

-- ----------------------------------------------------------------------------
-- sim schema (Simulator) — parity with public schema (rule 34.1)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS policy_sim_form_templates_select_authenticated ON sim.form_templates;
DROP POLICY IF EXISTS policy_sim_form_template_versions_select_authenticated ON sim.form_template_versions;
DROP POLICY IF EXISTS policy_sim_form_templates_pmo_admin_write ON sim.form_templates;
DROP POLICY IF EXISTS policy_sim_form_template_versions_pmo_admin_write ON sim.form_template_versions;

CREATE POLICY policy_sim_form_templates_select_authenticated
    ON sim.form_templates
    FOR SELECT
    TO authenticated
    USING (
        is_active = TRUE
        OR public.is_user_pmo_admin(auth.uid())
    );

CREATE POLICY policy_sim_form_template_versions_select_authenticated
    ON sim.form_template_versions
    FOR SELECT
    TO authenticated
    USING (TRUE);

CREATE POLICY policy_sim_form_templates_pmo_admin_write
    ON sim.form_templates
    FOR ALL
    TO authenticated
    USING (public.is_user_pmo_admin(auth.uid()))
    WITH CHECK (public.is_user_pmo_admin(auth.uid()));

CREATE POLICY policy_sim_form_template_versions_pmo_admin_write
    ON sim.form_template_versions
    FOR ALL
    TO authenticated
    USING (public.is_user_pmo_admin(auth.uid()))
    WITH CHECK (public.is_user_pmo_admin(auth.uid()));

GRANT SELECT ON sim.form_templates TO authenticated;
GRANT SELECT ON sim.form_template_versions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.form_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON sim.form_template_versions TO authenticated;
GRANT ALL ON sim.form_templates TO service_role;
GRANT ALL ON sim.form_template_versions TO service_role;

-- ----------------------------------------------------------------------------
-- Sidebar: "New Template" under Process Group Forms (PMO admin routes)
-- ----------------------------------------------------------------------------

INSERT INTO public.sidebar_config (
  dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
)
VALUES
  ('PMO', 'Process Group Forms', 'forms-new-template', 'New Template', 97, '/pmo/forms/new', 'FilePlus', TRUE)
ON CONFLICT (dashboard_type, section_name, document_type) DO UPDATE SET
  display_label = EXCLUDED.display_label,
  display_order = EXCLUDED.display_order,
  route_path = EXCLUDED.route_path,
  icon_name = EXCLUDED.icon_name,
  is_active = TRUE,
  updated_at = NOW();

DO $$
BEGIN
  IF to_regclass('sim.sidebar_config') IS NOT NULL THEN
    INSERT INTO sim.sidebar_config (
      dashboard_type, section_name, document_type, display_label, display_order, route_path, icon_name, is_active
    )
    VALUES
      ('PMO', 'Process Group Forms', 'forms-new-template', 'New Template', 97, '/simulator/pmo/forms/new', 'FilePlus', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Verification
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_public_policies INTEGER;
    v_sim_policies INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_public_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('form_templates', 'form_template_versions');

    SELECT COUNT(*) INTO v_sim_policies
    FROM pg_policies
    WHERE schemaname = 'sim'
      AND tablename IN ('form_templates', 'form_template_versions');

    RAISE NOTICE '================================================';
    RAISE NOTICE 'v754 Form Template Admin RLS Complete';
    RAISE NOTICE 'public schema policies: %', v_public_policies;
    RAISE NOTICE 'sim schema policies: %', v_sim_policies;
    RAISE NOTICE '================================================';
END $$;
