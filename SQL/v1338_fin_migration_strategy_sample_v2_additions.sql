-- ============================================================================
-- v1338: Data Migration Strategy + Data Scope — additions from the second sample strategy
-- ============================================================================
-- PRD v1336 section d.6 (owner check 2026-10-24: the form was built from Sample v1; Sample v2 adds
-- these). Added to the existing tabs, no new tabs; vendor-neutral (rule 26).
--   Strategy: cutover window approach, data loaded before cutover, migration sequence by entity,
--     runbooks, stage responsibilities, load error ownership, load file conventions, migration
--     participants, go / no-go decision points, stakeholder & regulator notifications, suspense
--     account closure days, take-on differences account; Environments + Staging; Reconciliation
--     Levels + raw data / functional; Sign-Off table gains a Department column (existing rows keep
--     their values — an empty Department cell is added in front).
--   Data Scope: migration method, responsible party, pre / post-migration actions, fields updated
--     manually after migration; Migration Steps becomes a table (Step · What is loaded · Mapping
--     sheet · Applies when — existing lines are read as rows); products + Nostro / vostro accounts,
--     images option relabelled (stored value unchanged).
-- Prerequisites: v1316–v1333 (fields), v1326 (table type). Idempotent.
-- ============================================================================

-- ── 1. Strategy: new fields ──────────────────────────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000000c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('cutover_window_approach', 'Cutover Window Approach', 'dropdown', 24, 'Cutover & Services', '[{"value":"single_window","label":"Single window (all data on the cutover weekend)"},{"value":"multi_window","label":"Multi-window (static data loaded early, delta on the cutover weekend)"}]'),
  ('data_loaded_before_cutover', 'Data Loaded Before the Cutover Weekend', 'multi_line', 25, 'Cutover & Services', NULL),
  ('migration_sequence', 'Migration Sequence by Entity / Instance', 'table', 19, 'Migration Approach', '[{"value":"entity_instance","label":"Entity / Instance"},{"value":"approach","label":"Approach"},{"value":"window","label":"Window"},{"value":"target_date","label":"Target Date","type":"date"}]'),
  ('runbooks', 'Runbooks', 'table', 20, 'Migration Approach', '[{"value":"runbook","label":"Runbook"},{"value":"audience","label":"Audience"},{"value":"owner","label":"Owner"},{"value":"reference","label":"Reference"}]'),
  ('stage_responsibilities', 'Stage Responsibilities', 'table', 18, 'Migration Approach', '[{"value":"stage","label":"Stage"},{"value":"what_happens","label":"What Happens"},{"value":"responsible","label":"Responsible"}]'),
  ('load_error_ownership', 'Load Error Ownership', 'table', 21, 'Migration Approach', '[{"value":"error_cause","label":"Error Cause"},{"value":"who_fixes","label":"Who Fixes"}]'),
  ('load_file_conventions', 'Load File Conventions', 'table', 50, 'Data Quality', '[{"value":"item","label":"Item"},{"value":"standard","label":"Standard"}]'),
  ('migration_participants', 'Migration Participants', 'table', 69, 'Roles & Environments', '[{"value":"participant","label":"Participant"},{"value":"organisation","label":"Organisation"}]'),
  ('go_no_go_decision_points', 'Go / No-Go Decision Points', 'table', 32, 'Cutover & Services', '[{"value":"decision_point","label":"Decision Point"},{"value":"when","label":"When"},{"value":"sign_off_by","label":"Sign-off By"}]'),
  ('stakeholder_notifications', 'Stakeholder & Regulator Notifications', 'table', 31, 'Cutover & Services', '[{"value":"stakeholder","label":"Stakeholder"},{"value":"what","label":"What"},{"value":"when","label":"When"},{"value":"owner","label":"Owner"}]'),
  ('suspense_closure_days', 'Suspense Account Closure (days after go-live)', 'number', 59, 'Migration Accounting & Reconciliation', NULL),
  ('take_on_differences_account', 'Take-on Differences Account', 'text', 60, 'Migration Accounting & Reconciliation', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- ── 2. Strategy: options, Sign-Off department column, field order ────────────────────
UPDATE public.local_register_fields SET dropdown_options = '[{"value":"development","label":"Development"},{"value":"sit","label":"System integration test"},{"value":"uat","label":"User acceptance test"},{"value":"staging","label":"Staging (transformation)"},{"value":"pre_production","label":"Pre-production"},{"value":"production","label":"Production"},{"value":"dr","label":"Disaster recovery"}]'::jsonb, updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND field_key = 'environments';

UPDATE public.local_register_fields SET dropdown_options = '[{"value":"record_counts","label":"Record counts"},{"value":"value_totals","label":"Value / balance totals"},{"value":"ledger_level","label":"Financial ledger level"},{"value":"entity_level","label":"Per data object / entity"},{"value":"sample_checks","label":"Sample-based field checks"},{"value":"business_validation","label":"Business user validation"},{"value":"raw_data","label":"Raw data (loaded vs extracted files)"},{"value":"functional","label":"Functional (system reports)"}]'::jsonb, updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND field_key = 'reconciliation_levels';

-- Existing Sign-Off rows (Name · Role · Date) gain an empty Department cell first, once.
DO $$
BEGIN
  PERFORM set_config('nidus.local_register_signoff', 'on', TRUE); -- locked records keep readable values too
  UPDATE public.local_register_records
  SET field_values = jsonb_set(field_values, '{approvals}',
        to_jsonb(E'\t' || replace(field_values ->> 'approvals', E'\n', E'\n\t')))
  WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid
    AND jsonb_typeof(field_values -> 'approvals') = 'string'
    AND btrim(field_values ->> 'approvals') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.local_register_fields f
      WHERE f.register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND f.field_key = 'approvals' AND f.dropdown_options @> '[{"value":"department"}]'
    );
  PERFORM set_config('nidus.local_register_signoff', '', TRUE);
END $$;

UPDATE public.local_register_fields SET dropdown_options = '[{"value":"department","label":"Department"},{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"date","label":"Date","type":"date"}]'::jsonb, updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND field_key = 'approvals';

UPDATE public.local_register_fields f
SET display_order = o.display_order, updated_at = NOW()
FROM (VALUES
  ('document_reference', 0),
  ('document_version', 1),
  ('document_owner', 2),
  ('system_category', 3),
  ('migration_type', 4),
  ('migration_approach', 5),
  ('target_system', 6),
  ('target_go_live_date', 7),
  ('next_review_date', 8),
  ('introduction', 9),
  ('purpose', 10),
  ('migration_objectives', 11),
  ('in_scope', 12),
  ('out_of_scope', 13),
  ('assumptions', 14),
  ('constraints', 15),
  ('approach_description', 16),
  ('migration_stages', 17),
  ('stage_responsibilities', 18),
  ('migration_sequence', 19),
  ('runbooks', 20),
  ('load_error_ownership', 21),
  ('configuration_dependencies', 22),
  ('system_readiness_checks', 23),
  ('cutover_window_approach', 24),
  ('data_loaded_before_cutover', 25),
  ('migration_window_start', 26),
  ('migration_window_end', 27),
  ('planned_downtime_hours', 28),
  ('services_impacted', 29),
  ('user_communication_required', 30),
  ('stakeholder_notifications', 31),
  ('go_no_go_decision_points', 32),
  ('rollback_approach', 33),
  ('data_categories', 34),
  ('data_objects', 35),
  ('source_systems', 36),
  ('migration_tool', 37),
  ('estimated_record_volume', 38),
  ('estimated_data_volume_gb', 39),
  ('mock_runs_planned', 40),
  ('dress_rehearsals_planned', 41),
  ('products_in_scope', 42),
  ('product_takeover_approach', 43),
  ('product_takeover_details', 44),
  ('balance_reconciliation_by_product', 45),
  ('product_owner_signoff_required', 46),
  ('data_integrity_rules', 47),
  ('data_cleansing_approach', 48),
  ('data_standards', 49),
  ('load_file_conventions', 50),
  ('data_quality_target', 51),
  ('data_owner_signoff_required', 52),
  ('financial_impact', 53),
  ('migration_accounting_entries', 54),
  ('regulatory_reporting_impacted', 55),
  ('ifrs9_impact', 56),
  ('ifrs9_data_carried_over', 57),
  ('holding_account_reference', 58),
  ('suspense_closure_days', 59),
  ('take_on_differences_account', 60),
  ('reconciliation_approach', 61),
  ('reconciliation_levels', 62),
  ('reconciliation_tolerance', 63),
  ('pre_migration_tasks', 64),
  ('post_migration_tasks', 65),
  ('overall_risk_rating', 66),
  ('risks_mitigations', 67),
  ('parties_involved', 68),
  ('migration_participants', 69),
  ('roles_responsibilities', 70),
  ('environments', 71),
  ('environment_management', 72),
  ('glossary', 73),
  ('appendices', 74),
  ('notes', 75),
  ('approvals', 76),
  ('version_history', 77)
) AS o(field_key, display_order)
WHERE f.register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND f.field_key = o.field_key;

-- ── 3. Data Scope: new fields, Migration Steps as a table, field order ───────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000000d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('migration_method', 'Migration Method', 'dropdown', 6, NULL, '[{"value":"automated_load_mapping_sheet","label":"Automated load (mapping sheet)"},{"value":"standard_upload_utility","label":"Standard upload utility"},{"value":"manual_capture","label":"Manual capture"},{"value":"interface_api_no_migration","label":"Interface / API (no migration)"},{"value":"not_migrated","label":"Not migrated"}]'),
  ('responsible_party', 'Responsible Party', 'dropdown', 7, NULL, '[{"value":"bank","label":"Bank"},{"value":"migration_partner","label":"Migration partner"},{"value":"target_system_vendor","label":"Target system vendor"},{"value":"legacy_system_vendor","label":"Legacy system vendor"},{"value":"shared","label":"Shared"}]'),
  ('pre_migration_actions', 'Pre-Migration Actions', 'multi_line', 15, 'Prerequisites & Steps', NULL),
  ('post_migration_actions', 'Post-Migration Actions', 'multi_line', 19, 'Prerequisites & Steps', NULL),
  ('manual_updates_after_migration', 'Fields Updated Manually After Migration', 'multi_line', 20, 'Prerequisites & Steps', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

UPDATE public.local_register_fields
SET field_type = 'table', field_label = 'Migration Steps', dropdown_options = '[{"value":"step","label":"Step"},{"value":"what_is_loaded","label":"What Is Loaded"},{"value":"mapping_sheet","label":"Mapping Sheet"},{"value":"applies_when","label":"Applies When"}]'::jsonb, updated_at = NOW()
WHERE register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND field_key = 'migration_steps';

UPDATE public.local_register_fields f
SET display_order = o.display_order, updated_at = NOW()
FROM (VALUES
  ('product_area', 0),
  ('legacy_source_module', 1),
  ('target_module', 2),
  ('product_owner', 3),
  ('migration_strategy_reference', 4),
  ('migration_wave', 5),
  ('migration_method', 6),
  ('responsible_party', 7),
  ('scope_criteria', 8),
  ('inclusion_rules', 9),
  ('exclusion_rules', 10),
  ('numbering_key_rules', 11),
  ('restrictions_carried_over', 12),
  ('special_conditions', 13),
  ('target_setup_prerequisites', 14),
  ('pre_migration_actions', 15),
  ('freeze_rules', 16),
  ('migration_steps', 17),
  ('data_dependencies', 18),
  ('post_migration_actions', 19),
  ('manual_updates_after_migration', 20),
  ('estimated_record_count', 21),
  ('estimated_balance_total', 22),
  ('balance_cutoff_rule', 23),
  ('uncleared_items_treatment', 24),
  ('accounting_entries', 25),
  ('reconciliation_checks', 26),
  ('balance_reconciliation_required', 27),
  ('product_owner_signed_off', 28),
  ('sign_off_date', 29),
  ('open_issues', 30),
  ('notes', 31)
) AS o(field_key, display_order)
WHERE f.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND f.field_key = o.field_key;

-- ── 4. Product lists: + Nostro / vostro accounts (after internal accounts); images relabelled ──
UPDATE public.local_register_fields f
SET dropdown_options = (
      SELECT jsonb_agg(x.e ORDER BY x.o)
      FROM (
        SELECT CASE WHEN t.e ->> 'value' = 'customer_images_signatures_and_mandates'
                 THEN jsonb_set(t.e, '{label}', '"Customer images, signatures, mandates & KYC documents"')
                 ELSE t.e END AS e,
               t.o::numeric AS o
        FROM jsonb_array_elements(f.dropdown_options) WITH ORDINALITY AS t(e, o)
        UNION ALL
        SELECT '{"value":"nostro_vostro_accounts","label":"Nostro / vostro accounts"}'::jsonb,
               (SELECT t2.o::numeric + 0.5 FROM jsonb_array_elements(f.dropdown_options) WITH ORDINALITY AS t2(e, o)
                 WHERE t2.e ->> 'value' = 'internal_office_accounts')
        WHERE NOT f.dropdown_options @> '[{"value":"nostro_vostro_accounts"}]'::jsonb
      ) x
    ),
    updated_at = NOW()
WHERE (f.register_id = '00000000-0000-4000-9001-00000000000c'::uuid AND f.field_key = 'products_in_scope')
   OR (f.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND f.field_key = 'product_area');

DO $$
DECLARE
  v_str INT;
  v_dsc INT;
BEGIN
  SELECT COUNT(*) INTO v_str FROM public.local_register_fields WHERE register_id = '00000000-0000-4000-9001-00000000000c'::uuid;
  SELECT COUNT(*) INTO v_dsc FROM public.local_register_fields WHERE register_id = '00000000-0000-4000-9001-00000000000d'::uuid;
  RAISE NOTICE 'v1338: Data Migration Strategy has % fields (expected 78); Data Scope has % (expected 32)', v_str, v_dsc;
END $$;

NOTIFY pgrst, 'reload schema';
