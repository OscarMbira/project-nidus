-- ============================================================================
-- v1321: Register documents — switch on the 30 document registers (v1318 PRD d.2)
-- ============================================================================
-- Owner decisions 2026-10-24 (PRD d.1 #2, #8, #9, #10):
--   1. is_document = TRUE for 30 registers: Banking 7, Construction 7, Information Technology 16.
--   2. Their statuses become Draft → In Review → Approved → Superseded; existing record values
--      are mapped (review→in_review, proposed→draft, accepted→approved, not_ready→draft,
--      ready→approved) in Platform (public) and Simulator (sim, records of system registers).
--   3. Migration Strategy: Version History moves to a "Document Control" tab at the end.
--      The "Approvals" field is kept (owner change 2026-10-24, supersedes PRD d.1 #8) — v1327 turns
--      it into a Name | Role | Date table labelled "Sign-Off" on its own Sign-Off tab.
-- Prerequisites: v1316, v1317, v1318. Idempotent.
-- ============================================================================

-- The 30 register keys are written into each statement (no temporary table: the Supabase SQL
-- editor may run statements on different connections, where a temp table is not visible).

-- ── 1. Map existing record statuses (records are not locked yet, so the v1318 trigger allows it) ──
UPDATE public.local_register_records r
SET status = CASE r.status
      WHEN 'review' THEN 'in_review'
      WHEN 'proposed' THEN 'draft'
      WHEN 'accepted' THEN 'approved'
      WHEN 'not_ready' THEN 'draft'
      WHEN 'ready' THEN 'approved'
    END,
    updated_at = NOW()
FROM public.local_registers lr
WHERE lr.id = r.register_id
  AND lr.register_key = ANY (ARRAY[
    'fin_migration_strategy', 'fin_cutover_strategy', 'fin_cutover_plan', 'fin_dress_rehearsal_strategy',
    'fin_testing_strategy', 'fin_hypercare_plan', 'fin_rollback_plan',
    'con_commissioning_plan', 'con_hse_plan', 'con_inspection_plan', 'con_recovery_plans',
    'con_site_logistics', 'con_method_statements', 'con_itps',
    'ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture',
    'ict_data_architecture', 'ict_integration_architecture', 'ict_security_architecture',
    'ict_functional_design', 'ict_technical_design', 'ict_integration_design', 'ict_data_design',
    'ict_ux_ui_design', 'ict_disaster_recovery', 'ict_support_model', 'ict_technology_roadmap',
    'ict_runbooks', 'ict_architecture_decisions'
  ])
  AND r.status IN ('review', 'proposed', 'accepted', 'not_ready', 'ready');

UPDATE sim.local_register_records r
SET status = CASE r.status
      WHEN 'review' THEN 'in_review'
      WHEN 'proposed' THEN 'draft'
      WHEN 'accepted' THEN 'approved'
      WHEN 'not_ready' THEN 'draft'
      WHEN 'ready' THEN 'approved'
    END,
    updated_at = NOW()
FROM public.local_registers lr
WHERE r.is_system_register = TRUE
  AND lr.id = r.register_id
  AND lr.register_key = ANY (ARRAY[
    'fin_migration_strategy', 'fin_cutover_strategy', 'fin_cutover_plan', 'fin_dress_rehearsal_strategy',
    'fin_testing_strategy', 'fin_hypercare_plan', 'fin_rollback_plan',
    'con_commissioning_plan', 'con_hse_plan', 'con_inspection_plan', 'con_recovery_plans',
    'con_site_logistics', 'con_method_statements', 'con_itps',
    'ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture',
    'ict_data_architecture', 'ict_integration_architecture', 'ict_security_architecture',
    'ict_functional_design', 'ict_technical_design', 'ict_integration_design', 'ict_data_design',
    'ict_ux_ui_design', 'ict_disaster_recovery', 'ict_support_model', 'ict_technology_roadmap',
    'ict_runbooks', 'ict_architecture_decisions'
  ])
  AND r.status IN ('review', 'proposed', 'accepted', 'not_ready', 'ready');

-- ── 2. Document switch + standard lifecycle ─────────────────────────────────────
UPDATE public.local_registers
SET is_document = TRUE,
    status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]'::jsonb,
    updated_at = NOW()
WHERE register_key = ANY (ARRAY[
    'fin_migration_strategy', 'fin_cutover_strategy', 'fin_cutover_plan', 'fin_dress_rehearsal_strategy',
    'fin_testing_strategy', 'fin_hypercare_plan', 'fin_rollback_plan',
    'con_commissioning_plan', 'con_hse_plan', 'con_inspection_plan', 'con_recovery_plans',
    'con_site_logistics', 'con_method_statements', 'con_itps',
    'ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture',
    'ict_data_architecture', 'ict_integration_architecture', 'ict_security_architecture',
    'ict_functional_design', 'ict_technical_design', 'ict_integration_design', 'ict_data_design',
    'ict_ux_ui_design', 'ict_disaster_recovery', 'ict_support_model', 'ict_technology_roadmap',
    'ict_runbooks', 'ict_architecture_decisions'
  ]);

-- ── 3. Migration Strategy: Version History → Document Control (last tab) ──
UPDATE public.local_register_fields
SET field_group = 'Document Control',
    field_label = 'Version History',
    display_order = 100,
    updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid
  AND field_key = 'version_history';

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.local_registers
  WHERE is_document = TRUE AND register_key = ANY (ARRAY[
    'fin_migration_strategy', 'fin_cutover_strategy', 'fin_cutover_plan', 'fin_dress_rehearsal_strategy',
    'fin_testing_strategy', 'fin_hypercare_plan', 'fin_rollback_plan',
    'con_commissioning_plan', 'con_hse_plan', 'con_inspection_plan', 'con_recovery_plans',
    'con_site_logistics', 'con_method_statements', 'con_itps',
    'ict_enterprise_architecture', 'ict_solution_architecture', 'ict_application_architecture',
    'ict_data_architecture', 'ict_integration_architecture', 'ict_security_architecture',
    'ict_functional_design', 'ict_technical_design', 'ict_integration_design', 'ict_data_design',
    'ict_ux_ui_design', 'ict_disaster_recovery', 'ict_support_model', 'ict_technology_roadmap',
    'ict_runbooks', 'ict_architecture_decisions'
  ]);
  RAISE NOTICE 'v1321: % document registers switched on (expected 30, or more if accounts hold copies)', v_count;
END $$;


NOTIFY pgrst, 'reload schema';
