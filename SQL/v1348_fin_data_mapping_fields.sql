-- ============================================================================
-- v1348: Data Mapping (FIN pack, Data Migration) — full mapping sheet form with tabs
-- ============================================================================
-- Owner request 2026-11-09: the Data Mapping form only had Title / Description / Status. Adds what a
-- data mapping sheet (DMS) records for one data object, grouped into tabs (field_group = tab;
-- ungrouped fields stay on Details):
--   Details              — DMS reference, data object, product / data area (same list as Data
--                          Scope), mapping version, load type, load sequence, migration wave,
--                          business owner, technical analyst
--   Source & Target      — source system, source tables / files, extract file name, target
--                          module, target table / load activity, load method, record key rule
--   Field Mappings       — field mapping table (target field, source field(s), transformation
--                          rule, mandatory, default value), code / lookup value mappings,
--                          mapping completeness %
--   Rules & Validation   — selection and exclusion criteria, transformation rules, validation
--                          rules before load, known data quality issues, open questions (table)
--   Load & Reconciliation— expected record count, load results per run (table), reconciliation
--                          keys and control totals, reconciliation report reference
--   Approval             — business and technical reviewers with sign-off dates
--   Notes                — change history (table), notes
-- Status workflow: Draft → Reviewed → Approved → Tested in Mock → Baselined for Go-Live (existing
-- keys kept). All new fields optional, vendor-neutral (rule 26). Platform register definition;
-- the Simulator reads the same system register definitions. Sample values: v1349.
-- Prerequisites: v947 (register), v1297 (tabs), v1326 (table type), v1338 (Data Scope products).
-- Idempotent.
-- ============================================================================

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000000f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details
  ('dms_reference', 'Mapping Sheet (DMS) Reference', 'text', 0, NULL, NULL),
  ('data_object', 'Data Object / Entity', 'text', 1, NULL, NULL),
  ('product_area', 'Product / Data Area', 'dropdown', 2, NULL, NULL),
  ('mapping_version', 'Mapping Version', 'text', 3, NULL, NULL),
  ('load_type', 'Load Type', 'dropdown', 4, NULL, '[{"value":"reference","label":"Reference / parameter data"},{"value":"static","label":"Static data"},{"value":"financial","label":"Financial data (balances, contracts)"},{"value":"delta","label":"Delta (changes after the static load)"}]'),
  ('load_sequence', 'Load Sequence', 'number', 5, NULL, NULL),
  ('migration_wave', 'Migration Wave / Window', 'text', 6, NULL, NULL),
  ('business_owner', 'Business Owner', 'user_picker', 7, NULL, NULL),
  ('technical_analyst', 'Technical / Mapping Analyst', 'user_picker', 8, NULL, NULL),

  -- Source & Target
  ('source_system', 'Source System', 'text', 9, 'Source & Target', NULL),
  ('source_tables', 'Source Tables / Files', 'multi_line', 10, 'Source & Target', NULL),
  ('extract_file_name', 'Extract File Name', 'text', 11, 'Source & Target', NULL),
  ('target_module', 'Target Module', 'text', 12, 'Source & Target', NULL),
  ('target_table', 'Target Table / Load Activity', 'text', 13, 'Source & Target', NULL),
  ('load_method', 'Load Method', 'dropdown', 14, 'Source & Target', '[{"value":"automated_load_mapping_sheet","label":"Automated load (mapping sheet)"},{"value":"standard_upload_utility","label":"Standard upload utility"},{"value":"manual_capture","label":"Manual capture"},{"value":"journal_capture","label":"Journal / data capture"}]'),
  ('record_key_rule', 'Record Key / Alternate Key Rule', 'multi_line', 15, 'Source & Target', NULL),

  -- Field Mappings
  ('field_mappings', 'Field Mappings', 'table', 16, 'Field Mappings', '[{"value":"target_field","label":"Target Field"},{"value":"source_field","label":"Source Field(s)"},{"value":"rule","label":"Transformation Rule"},{"value":"mandatory","label":"Mandatory"},{"value":"default_value","label":"Default Value"}]'),
  ('value_mappings', 'Code / Lookup Value Mappings', 'table', 17, 'Field Mappings', '[{"value":"code_table","label":"Code Table"},{"value":"source_value","label":"Source Value"},{"value":"target_value","label":"Target Value"}]'),
  ('mapping_completeness', 'Mapping Completeness (%)', 'number', 18, 'Field Mappings', NULL),

  -- Rules & Validation
  ('selection_criteria', 'Selection Criteria (records extracted)', 'multi_line', 19, 'Rules & Validation', NULL),
  ('exclusion_criteria', 'Exclusion Criteria', 'multi_line', 20, 'Rules & Validation', NULL),
  ('transformation_rules', 'General Transformation Rules', 'multi_line', 21, 'Rules & Validation', NULL),
  ('validation_rules', 'Validation Rules Before Load', 'multi_line', 22, 'Rules & Validation', NULL),
  ('data_quality_issues', 'Known Data Quality Issues', 'multi_line', 23, 'Rules & Validation', NULL),
  ('open_questions', 'Open Questions', 'table', 24, 'Rules & Validation', '[{"value":"question","label":"Question"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status"}]'),

  -- Load & Reconciliation
  ('expected_record_count', 'Expected Record Count', 'number', 25, 'Load & Reconciliation', NULL),
  ('load_results', 'Load Results', 'table', 26, 'Load & Reconciliation', '[{"value":"run","label":"Run"},{"value":"date","label":"Date","type":"date"},{"value":"expected","label":"Expected"},{"value":"loaded","label":"Loaded"},{"value":"rejected","label":"Rejected"},{"value":"result","label":"Result"}]'),
  ('reconciliation_keys', 'Reconciliation Keys and Control Totals', 'multi_line', 27, 'Load & Reconciliation', NULL),
  ('reconciliation_report', 'Reconciliation Report Reference', 'text', 28, 'Load & Reconciliation', NULL),

  -- Approval
  ('business_reviewer', 'Business Reviewer', 'user_picker', 29, 'Approval', NULL),
  ('business_signoff_date', 'Business Sign-Off Date', 'date', 30, 'Approval', NULL),
  ('technical_reviewer', 'Technical Reviewer', 'user_picker', 31, 'Approval', NULL),
  ('technical_signoff_date', 'Technical Sign-Off Date', 'date', 32, 'Approval', NULL),

  -- Notes
  ('change_history', 'Change History', 'table', 33, 'Notes', '[{"value":"version","label":"Version"},{"value":"date","label":"Date","type":"date"},{"value":"changed_by","label":"Changed By"},{"value":"change","label":"Change"}]'),
  ('notes', 'Notes', 'multi_line', 34, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000000f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- Product / Data Area uses the Data Scope product list, so mapping sheets and scope records match.
UPDATE public.local_register_fields f
SET dropdown_options = s.dropdown_options, updated_at = NOW()
FROM public.local_register_fields s
WHERE f.register_id = '00000000-0000-4000-9001-00000000000f'::uuid AND f.field_key = 'product_area'
  AND s.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND s.field_key = 'product_area';

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"reviewed","label":"Reviewed"},{"key":"approved","label":"Approved"},{"key":"mock_tested","label":"Tested in Mock"},{"key":"baselined","label":"Baselined for Go-Live"}]'::jsonb,
    updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000000f'::uuid;

-- Check: 35 fields in 7 tabs; product list copied.
SELECT COALESCE(field_group, 'Details') AS tab, count(*) AS fields,
       max(jsonb_array_length(COALESCE(dropdown_options, '[]'::jsonb))) FILTER (WHERE field_key = 'product_area') AS product_options
FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-00000000000f'::uuid
GROUP BY 1 ORDER BY min(display_order);
