-- =============================================================================
-- v776b: RLS for pmo_legacy_document_templates (public + sim)
-- Prerequisites: v776_legacy_document_templates_tables.sql
-- =============================================================================

ALTER TABLE public.pmo_legacy_document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pldt_select_published" ON public.pmo_legacy_document_templates;
CREATE POLICY "pldt_select_published" ON public.pmo_legacy_document_templates
  FOR SELECT USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

DROP POLICY IF EXISTS "pldt_insert_pmo" ON public.pmo_legacy_document_templates;
CREATE POLICY "pldt_insert_pmo" ON public.pmo_legacy_document_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

DROP POLICY IF EXISTS "pldt_update_pmo" ON public.pmo_legacy_document_templates;
CREATE POLICY "pldt_update_pmo" ON public.pmo_legacy_document_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

DROP POLICY IF EXISTS "pldt_delete_pmo" ON public.pmo_legacy_document_templates;
CREATE POLICY "pldt_delete_pmo" ON public.pmo_legacy_document_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

ALTER TABLE sim.pmo_legacy_document_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_pldt_select" ON sim.pmo_legacy_document_templates;
CREATE POLICY "sim_pldt_select" ON sim.pmo_legacy_document_templates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sim_pldt_write" ON sim.pmo_legacy_document_templates;
CREATE POLICY "sim_pldt_write" ON sim.pmo_legacy_document_templates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE 'v776b_legacy_document_templates_rls.sql applied';
END $$;
