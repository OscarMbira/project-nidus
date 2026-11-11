-- ============================================================================
-- v1326: Local Register "Table" field type — Glossary, Appendices and Version History as tables
-- ============================================================================
-- Owner request 2026-10-24: capture "Version History (Version – Date – Change)", "Glossary of
-- Terms (Term – Definition)" and "Appendices (Title – Reference / Link)" in a tabular format.
--
--   1. New field type 'table' (public + sim): columns are defined in dropdown_options as
--      [{ "value": key, "label": ..., "type": "text" | "date" }]. The value stays text — one row per
--      line, a tab between cells — so search and list exports keep working, and values saved as
--      "A – B – C" lines are read as rows without any conversion.
--   2. On the 30 document registers (v1318 PRD d.2), selected by register_key so this file
--      does not depend on v1318 having run:
--        Glossary of Terms  → Term | Definition
--        Appendices         → Title | Reference / Link
--        Version History    → Version | Date (date picker) | Author | Change
--      The complete document export already places these (Glossary = section 2, Appendices,
--      Document Control) and now reads their columns directly.
-- The Migration Strategy "Approvals" list is not converted — v1321 removes it (the Sign-off tab
-- and the document's sign-off table replace it).
-- Prerequisites: v1316 (and the forms v1322–v1324 for the 29 other registers). Idempotent;
-- re-run after v1322–v1324 if those run later, so their new fields become tables too.
-- ============================================================================

-- ── 1. 'table' field type ───────────────────────────────────────────────────────────
ALTER TABLE public.local_register_fields DROP CONSTRAINT IF EXISTS chk_local_register_fields_field_type;
ALTER TABLE public.local_register_fields
  ADD CONSTRAINT chk_local_register_fields_field_type CHECK (field_type IN
    ('text', 'long_text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency', 'table'));

ALTER TABLE sim.local_register_fields DROP CONSTRAINT IF EXISTS chk_sim_local_register_fields_field_type;
ALTER TABLE sim.local_register_fields
  ADD CONSTRAINT chk_sim_local_register_fields_field_type CHECK (field_type IN
    ('text', 'long_text', 'multi_line', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'user_picker', 'currency', 'table'));

-- ── 2. Document registers: glossary / appendices / version history become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table',
    field_label = v.field_label,
    dropdown_options = v.columns::jsonb,
    updated_at = NOW()
FROM public.local_registers lr,
  (VALUES
    ('glossary', 'Glossary of Terms',
      '[{"value":"term","label":"Term"},{"value":"definition","label":"Definition"}]'),
    ('appendices', 'Appendices',
      '[{"value":"title","label":"Title"},{"value":"reference","label":"Reference / Link"}]'),
    ('version_history', 'Version History',
      '[{"value":"version","label":"Version"},{"value":"date","label":"Date","type":"date"},{"value":"author","label":"Author"},{"value":"change","label":"Change"}]')
  ) AS v(field_key, field_label, columns)
WHERE lr.id = f.register_id
  AND lr.register_key IN (
    'fin_migration_strategy', 'fin_cutover_strategy', 'fin_cutover_plan', 'fin_dress_rehearsal_strategy',
    'fin_testing_strategy', 'fin_hypercare_plan', 'fin_rollback_plan',
    'con_commissioning_plan', 'con_hse_plan', 'con_inspection_plan', 'con_recovery_plans',
    'con_site_logistics', 'con_method_statements', 'con_itps',
    'ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture',
    'ict_data_architecture', 'ict_integration_architecture', 'ict_security_architecture',
    'ict_functional_design', 'ict_technical_design', 'ict_integration_design', 'ict_data_design',
    'ict_ux_ui_design', 'ict_disaster_recovery', 'ict_support_model', 'ict_technology_roadmap',
    'ict_runbooks', 'ict_architecture_decisions'
  )
  AND f.field_key = v.field_key;

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.local_register_fields f
  JOIN public.local_registers lr ON lr.id = f.register_id
  WHERE lr.register_key IN (
    'fin_migration_strategy', 'fin_cutover_strategy', 'fin_cutover_plan', 'fin_dress_rehearsal_strategy',
    'fin_testing_strategy', 'fin_hypercare_plan', 'fin_rollback_plan',
    'con_commissioning_plan', 'con_hse_plan', 'con_inspection_plan', 'con_recovery_plans',
    'con_site_logistics', 'con_method_statements', 'con_itps',
    'ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture',
    'ict_data_architecture', 'ict_integration_architecture', 'ict_security_architecture',
    'ict_functional_design', 'ict_technical_design', 'ict_integration_design', 'ict_data_design',
    'ict_ux_ui_design', 'ict_disaster_recovery', 'ict_support_model', 'ict_technology_roadmap',
    'ict_runbooks', 'ict_architecture_decisions'
  ) AND f.field_type = 'table';
  RAISE NOTICE 'v1326: % table fields on document registers (expected 90 = 30 registers × 3)', v_count;
END $$;

NOTIFY pgrst, 'reload schema';
