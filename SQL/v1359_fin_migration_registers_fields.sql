-- ============================================================================
-- v1359: Data Migration registers — full forms with tabs (six registers)
-- ============================================================================
-- Owner request 2026-11-09: Data Transformation, Migration Rules, Mock Migrations, Reconciliations,
-- Migration Defects and Migration Sign-Off only had Title / Description / Status (Mock Migrations and
-- Reconciliations had one dropdown). Each gets the fields its records are used for, grouped into tabs
-- (field_group = tab; ungrouped fields stay on Details), and a fuller status workflow (existing keys
-- kept). Mock Round gains Mock 3. "Product / Data Area" fields use the Data Scope product list. All new
-- fields optional, vendor-neutral (rule 26). Platform register definitions; the Simulator reads the
-- same system register definitions. Sample values: v1360.
--   Data Transformation: Details · Transformation Logic · Build & Test · Approval · Notes
--   Migration Rules: Details · Rule Detail · Enforcement · Approval · Notes
--   Mock Migrations: Details · Scope & Data · Execution · Results & Issues · Exit & Sign-Off · Notes
--   Reconciliations: Details · Figures · Method & Evidence · Exceptions · Sign-Off · Notes
--   Migration Defects: Details · Analysis · Resolution · Retest · Notes
--   Migration Sign-Off: Details · Approvers · Evidence · Decision · Notes
-- Prerequisites: v947 (registers), v1297 (tabs), v1326 (table type), v1338 (Data Scope products).
-- Idempotent.
-- ============================================================================

-- ── Data Transformation (fin_data_transformation) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000011'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('transformation_reference', 'Transformation Reference', 'text', 0, NULL, NULL),
  ('transformation_type', 'Transformation Type', 'dropdown', 1, NULL, '[{"value":"numbering_keys","label":"Numbering / keys"},{"value":"code_mapping","label":"Code mapping"},{"value":"value_derivation","label":"Value derivation"},{"value":"value_dating","label":"Dates / value dating"},{"value":"format_conversion","label":"File format conversion"},{"value":"structure_conversion","label":"Structure conversion (e.g. records to bills)"},{"value":"harmonisation","label":"Harmonisation across instances"}]'),
  ('product_area', 'Product / Data Area', 'dropdown', 2, NULL, NULL),
  ('data_objects', 'Data Objects Affected', 'text', 3, NULL, NULL),
  ('affected_mapping_sheets', 'Affected Mapping Sheets (DMS)', 'text', 4, NULL, NULL),
  ('transformation_owner', 'Transformation Owner', 'user_picker', 5, NULL, NULL),
  ('developer', 'Developer', 'user_picker', 6, NULL, NULL),
  ('source_fields', 'Source Field(s)', 'text', 7, 'Transformation Logic', NULL),
  ('target_fields', 'Target Field(s)', 'text', 8, 'Transformation Logic', NULL),
  ('transformation_logic', 'Transformation Logic', 'multi_line', 9, 'Transformation Logic', NULL),
  ('examples', 'Examples', 'table', 10, 'Transformation Logic', '[{"value":"source_value","label":"Source Value"},{"value":"target_value","label":"Target Value"},{"value":"note","label":"Note"}]'),
  ('exceptions', 'Exceptions and Edge Cases', 'multi_line', 11, 'Transformation Logic', NULL),
  ('implemented_in', 'Implemented In', 'dropdown', 12, 'Build & Test', '[{"value":"extract_utility","label":"Extract utility"},{"value":"staging_scripts","label":"Staging scripts"},{"value":"etl_tool","label":"ETL tool"},{"value":"load_tool","label":"Target load tool"},{"value":"manual","label":"Manual procedure"}]'),
  ('script_reference', 'Script / Job Reference', 'text', 13, 'Build & Test', NULL),
  ('unit_tested', 'Unit Tested', 'boolean', 14, 'Build & Test', NULL),
  ('tested_in', 'Last Tested In', 'dropdown', 15, 'Build & Test', '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress Rehearsal"},{"value":"final_migration","label":"Final Migration"}]'),
  ('records_transformed', 'Records Transformed (last run)', 'number', 16, 'Build & Test', NULL),
  ('exceptions_found', 'Exceptions Found (last run)', 'number', 17, 'Build & Test', NULL),
  ('business_approver', 'Business Approver', 'user_picker', 18, 'Approval', NULL),
  ('approval_date', 'Approval Date', 'date', 19, 'Approval', NULL),
  ('notes', 'Notes', 'multi_line', 20, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000011'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"in_test","label":"In Test"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000011'::uuid;

-- ── Migration Rules (fin_migration_rules) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000012'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('rule_reference', 'Rule Reference', 'text', 0, NULL, NULL),
  ('rule_category', 'Rule Category', 'dropdown', 1, NULL, '[{"value":"freeze_cutover","label":"Freeze and cutover"},{"value":"selection_scope","label":"Selection and scope"},{"value":"numbering_keys","label":"Numbering and keys"},{"value":"value_dating","label":"Value dating and accruals"},{"value":"expiry_maturity","label":"Expiry and maturity"},{"value":"exclusion","label":"Exclusion"},{"value":"load_control","label":"Load control"},{"value":"messaging","label":"Messaging and advices"},{"value":"accounting","label":"Migration accounting"}]'),
  ('applies_to', 'Applies To (products / data areas)', 'multi_select', 2, NULL, NULL),
  ('rule_owner', 'Rule Owner', 'user_picker', 3, NULL, NULL),
  ('source_reference', 'Source (strategy section / decision)', 'text', 4, NULL, NULL),
  ('rule_statement', 'Rule Statement', 'multi_line', 5, 'Rule Detail', NULL),
  ('rationale', 'Rationale', 'multi_line', 6, 'Rule Detail', NULL),
  ('scenarios', 'Scenarios and Treatment', 'table', 7, 'Rule Detail', '[{"value":"scenario","label":"Scenario"},{"value":"treatment","label":"Treatment"}]'),
  ('exceptions', 'Exceptions', 'multi_line', 8, 'Rule Detail', NULL),
  ('enforced_by', 'Enforced By', 'dropdown', 9, 'Enforcement', '[{"value":"selection_query","label":"Selection query"},{"value":"transformation_script","label":"Transformation script"},{"value":"load_validation","label":"Target load validation"},{"value":"manual_procedure","label":"Manual procedure"},{"value":"legacy_setting","label":"Legacy system setting"}]'),
  ('enforcement_point', 'Enforcement Point', 'dropdown', 10, 'Enforcement', '[{"value":"before_freeze","label":"Before the freeze"},{"value":"extract","label":"Extract"},{"value":"staging","label":"Staging / transformation"},{"value":"load","label":"Load"},{"value":"after_load","label":"After the load"}]'),
  ('compliance_check', 'How Compliance Is Checked', 'multi_line', 11, 'Enforcement', NULL),
  ('breaches_last_run', 'Breaches Found (last run)', 'number', 12, 'Enforcement', NULL),
  ('approved_by', 'Approved By', 'user_picker', 13, 'Approval', NULL),
  ('approval_date', 'Approval Date', 'date', 14, 'Approval', NULL),
  ('applies_from', 'Applies From', 'dropdown', 15, 'Approval', '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress Rehearsal"},{"value":"final_migration","label":"Final Migration"}]'),
  ('review_date', 'Next Review Date', 'date', 16, 'Approval', NULL),
  ('notes', 'Notes', 'multi_line', 17, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000012'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"retired","label":"Retired"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000012'::uuid;

-- ── Mock Migrations (fin_mock_migrations) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000013'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('mock_round', 'Mock Round', 'dropdown', 0, NULL, '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress Rehearsal"},{"value":"final_migration","label":"Final Migration"}]'),
  ('migration_window', 'Migration Window', 'dropdown', 1, NULL, '[{"value":"static","label":"Static data"},{"value":"financial","label":"Financial data"},{"value":"full","label":"Full scope"}]'),
  ('environment', 'Environment', 'dropdown', 2, NULL, '[{"value":"sit","label":"System integration test"},{"value":"uat","label":"User acceptance test"},{"value":"pre_production","label":"Pre-production"},{"value":"production","label":"Production"}]'),
  ('planned_start', 'Planned Start', 'date', 3, NULL, NULL),
  ('planned_end', 'Planned End', 'date', 4, NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 5, NULL, NULL),
  ('actual_end', 'Actual End', 'date', 6, NULL, NULL),
  ('mock_lead', 'Mock Lead', 'user_picker', 7, NULL, NULL),
  ('data_in_scope', 'Data Objects in Scope', 'multi_line', 8, 'Scope & Data', NULL),
  ('source_data_as_at', 'Source Data As At', 'date', 9, 'Scope & Data', NULL),
  ('entities_included', 'Entities / Instances Included', 'text', 10, 'Scope & Data', NULL),
  ('planned_duration_hours', 'Planned Duration (hours)', 'number', 11, 'Execution', NULL),
  ('actual_duration_hours', 'Actual Duration (hours)', 'number', 12, 'Execution', NULL),
  ('records_expected', 'Records Expected', 'number', 13, 'Execution', NULL),
  ('records_loaded', 'Records Loaded', 'number', 14, 'Execution', NULL),
  ('success_rate', 'Load Success Rate (%)', 'number', 15, 'Execution', NULL),
  ('load_results', 'Load Results by Data Object', 'table', 16, 'Execution', '[{"value":"data_object","label":"Data Object"},{"value":"expected","label":"Expected"},{"value":"loaded","label":"Loaded"},{"value":"rejected","label":"Rejected"},{"value":"hours","label":"Duration (h)"}]'),
  ('reconciliation_result', 'Reconciliation Result', 'dropdown', 17, 'Results & Issues', '[{"value":"not_started","label":"Not started"},{"value":"reconciled","label":"Reconciled"},{"value":"with_exceptions","label":"Reconciled with exceptions"},{"value":"failed","label":"Failed"}]'),
  ('defects_raised', 'Defects Raised', 'number', 18, 'Results & Issues', NULL),
  ('critical_defects', 'Critical Defects', 'number', 19, 'Results & Issues', NULL),
  ('lessons_learned', 'Lessons Learned', 'multi_line', 20, 'Results & Issues', NULL),
  ('runbook_changes', 'Runbook Changes', 'multi_line', 21, 'Results & Issues', NULL),
  ('exit_criteria', 'Exit Criteria', 'multi_line', 22, 'Exit & Sign-Off', NULL),
  ('exit_criteria_met', 'Exit Criteria Met', 'boolean', 23, 'Exit & Sign-Off', NULL),
  ('decision', 'Decision', 'dropdown', 24, 'Exit & Sign-Off', '[{"value":"proceed","label":"Proceed to the next round"},{"value":"proceed_with_conditions","label":"Proceed with conditions"},{"value":"repeat","label":"Repeat the round"},{"value":"pending","label":"Pending"}]'),
  ('signed_off_by', 'Signed Off By', 'user_picker', 25, 'Exit & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 26, 'Exit & Sign-Off', NULL),
  ('notes', 'Notes', 'multi_line', 27, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000013'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"repeat_required","label":"Repeat Required"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000013'::uuid;

-- ── Reconciliations (fin_reconciliations) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000014'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('reconciliation_type', 'Reconciliation Type', 'dropdown', 0, NULL, '[{"value":"record_counts","label":"Record Counts"},{"value":"financial","label":"Financial"},{"value":"customer","label":"Customer"},{"value":"account","label":"Account"},{"value":"ledger","label":"General Ledger"},{"value":"sample_check","label":"Sample / Field-Level Check"}]'),
  ('migration_run', 'Migration Run', 'dropdown', 1, NULL, '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress Rehearsal"},{"value":"final_migration","label":"Final Migration"}]'),
  ('product_area', 'Product / Data Area', 'dropdown', 2, NULL, NULL),
  ('data_object', 'Data Object', 'text', 3, NULL, NULL),
  ('reconciliation_level', 'Level', 'dropdown', 4, NULL, '[{"value":"summary","label":"Summary (control totals)"},{"value":"detail","label":"Detail (record by record)"},{"value":"field","label":"Field level (sample)"}]'),
  ('reconciler', 'Reconciled By', 'user_picker', 5, NULL, NULL),
  ('reconciliation_date', 'Reconciliation Date', 'date', 6, NULL, NULL),
  ('source_count', 'Source Record Count', 'number', 7, 'Figures', NULL),
  ('target_count', 'Target Record Count', 'number', 8, 'Figures', NULL),
  ('rejected_count', 'Rejected Records', 'number', 9, 'Figures', NULL),
  ('source_value', 'Source Value', 'currency', 10, 'Figures', NULL),
  ('target_value', 'Target Value', 'currency', 11, 'Figures', NULL),
  ('difference_value', 'Difference', 'currency', 12, 'Figures', NULL),
  ('tolerance', 'Tolerance', 'currency', 13, 'Figures', NULL),
  ('within_tolerance', 'Within Tolerance', 'boolean', 14, 'Figures', NULL),
  ('control_total_source', 'Control Total Source', 'text', 15, 'Method & Evidence', NULL),
  ('comparison_method', 'Comparison Method', 'dropdown', 16, 'Method & Evidence', '[{"value":"automated_script","label":"Automated comparison script"},{"value":"spreadsheet","label":"Spreadsheet comparison"},{"value":"system_report","label":"System reports"},{"value":"sample_review","label":"Sample review by business users"}]'),
  ('report_reference', 'Reconciliation Report Reference', 'text', 17, 'Method & Evidence', NULL),
  ('exceptions_summary', 'Exceptions Summary', 'multi_line', 18, 'Exceptions', NULL),
  ('root_cause', 'Root Cause', 'multi_line', 19, 'Exceptions', NULL),
  ('linked_defects', 'Linked Defects', 'text', 20, 'Exceptions', NULL),
  ('action_owner', 'Action Owner', 'user_picker', 21, 'Exceptions', NULL),
  ('action_due_date', 'Action Due Date', 'date', 22, 'Exceptions', NULL),
  ('signed_off_by', 'Signed Off By', 'user_picker', 23, 'Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 24, 'Sign-Off', NULL),
  ('notes', 'Notes', 'multi_line', 25, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000014'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"reconciled","label":"Reconciled"},{"key":"exception","label":"Exception"},{"key":"signed_off","label":"Signed Off"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000014'::uuid;

-- ── Migration Defects (fin_migration_defects) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000015'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('defect_reference', 'Defect Reference', 'text', 0, NULL, NULL),
  ('severity', 'Severity', 'dropdown', 1, NULL, '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]'),
  ('priority', 'Priority', 'dropdown', 2, NULL, '[{"value":"p1","label":"P1 – fix before the next run"},{"value":"p2","label":"P2 – fix before go-live"},{"value":"p3","label":"P3 – fix in hypercare"},{"value":"p4","label":"P4 – nice to have"}]'),
  ('defect_category', 'Category', 'dropdown', 3, NULL, '[{"value":"data_quality","label":"Source data quality"},{"value":"mapping","label":"Mapping"},{"value":"transformation","label":"Transformation"},{"value":"load_tool","label":"Load tool"},{"value":"performance","label":"Performance / timing"},{"value":"sequence","label":"Load sequence / runbook"},{"value":"environment","label":"Environment"},{"value":"configuration","label":"Target configuration"},{"value":"reconciliation","label":"Reconciliation"}]'),
  ('found_in', 'Found In', 'dropdown', 4, NULL, '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress Rehearsal"},{"value":"final_migration","label":"Final Migration"}]'),
  ('product_area', 'Product / Data Area', 'dropdown', 5, NULL, NULL),
  ('data_object', 'Data Object', 'text', 6, NULL, NULL),
  ('raised_by', 'Raised By', 'user_picker', 7, NULL, NULL),
  ('raised_date', 'Raised Date', 'date', 8, NULL, NULL),
  ('records_affected', 'Records Affected', 'number', 9, 'Analysis', NULL),
  ('evidence', 'Symptoms and Evidence', 'multi_line', 10, 'Analysis', NULL),
  ('root_cause', 'Root Cause', 'multi_line', 11, 'Analysis', NULL),
  ('affected_mapping_sheets', 'Affected Mapping Sheets (DMS)', 'text', 12, 'Analysis', NULL),
  ('assigned_to', 'Assigned To', 'user_picker', 13, 'Resolution', NULL),
  ('resolving_party', 'Resolving Party', 'dropdown', 14, 'Resolution', '[{"value":"bank","label":"Bank"},{"value":"migration_partner","label":"Migration partner"},{"value":"target_system_vendor","label":"Target system vendor"},{"value":"legacy_system_vendor","label":"Legacy system vendor"}]'),
  ('fix_type', 'Fix Type', 'dropdown', 15, 'Resolution', '[{"value":"source_data","label":"Source data correction"},{"value":"mapping","label":"Mapping change"},{"value":"transformation","label":"Transformation change"},{"value":"configuration","label":"Target configuration"},{"value":"runbook","label":"Runbook / sequence"},{"value":"tool","label":"Tool / performance tuning"},{"value":"procedure","label":"Procedure / checklist"}]'),
  ('fix_description', 'Fix Description', 'multi_line', 16, 'Resolution', NULL),
  ('target_fix_date', 'Target Fix Date', 'date', 17, 'Resolution', NULL),
  ('fixed_date', 'Fixed Date', 'date', 18, 'Resolution', NULL),
  ('retest_in', 'Retest In', 'dropdown', 19, 'Retest', '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress Rehearsal"},{"value":"final_migration","label":"Final Migration"}]'),
  ('retest_result', 'Retest Result', 'dropdown', 20, 'Retest', '[{"value":"not_tested","label":"Not yet tested"},{"value":"passed","label":"Passed"},{"value":"failed","label":"Failed"}]'),
  ('retest_date', 'Retest Date', 'date', 21, 'Retest', NULL),
  ('closed_by', 'Closed By', 'user_picker', 22, 'Retest', NULL),
  ('notes', 'Notes', 'multi_line', 23, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000015'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"resolved","label":"Resolved"},{"key":"closed","label":"Closed"},{"key":"deferred","label":"Deferred / Accepted"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000015'::uuid;

-- ── Migration Sign-Off (fin_migration_sign_off) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000016'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('signoff_reference', 'Sign-Off Reference', 'text', 0, NULL, NULL),
  ('signoff_type', 'Sign-Off Type', 'dropdown', 1, NULL, '[{"value":"strategy_baseline","label":"Strategy baseline"},{"value":"mock_handoff","label":"Mock data hand-off"},{"value":"product_owner","label":"Product owner"},{"value":"department_head","label":"Department head"},{"value":"finance","label":"Finance"},{"value":"information_security","label":"Information security"},{"value":"internal_audit","label":"Internal audit"},{"value":"go_live","label":"Go-live"}]'),
  ('migration_run', 'Migration Run', 'dropdown', 2, NULL, '[{"value":"mock_1","label":"Mock 1"},{"value":"mock_2","label":"Mock 2"},{"value":"mock_3","label":"Mock 3"},{"value":"dress_rehearsal","label":"Dress Rehearsal"},{"value":"final_migration","label":"Final Migration"}]'),
  ('products_covered', 'Products / Data Areas Covered', 'multi_select', 3, NULL, NULL),
  ('signoff_owner', 'Sign-Off Coordinator', 'user_picker', 4, NULL, NULL),
  ('requested_date', 'Requested Date', 'date', 5, NULL, NULL),
  ('due_date', 'Due Date', 'date', 6, NULL, NULL),
  ('approvers', 'Approvers', 'table', 7, 'Approvers', '[{"value":"department","label":"Department"},{"value":"name","label":"Name"},{"value":"role","label":"Role"},{"value":"decision","label":"Decision"},{"value":"date","label":"Date","type":"date"}]'),
  ('evidence_reviewed', 'Evidence Reviewed', 'multi_line', 8, 'Evidence', NULL),
  ('reconciliation_references', 'Reconciliation References', 'text', 9, 'Evidence', NULL),
  ('open_defects', 'Open Defects at Sign-Off', 'number', 10, 'Evidence', NULL),
  ('conditions', 'Conditions / Caveats', 'multi_line', 11, 'Evidence', NULL),
  ('decision', 'Decision', 'dropdown', 12, 'Decision', '[{"value":"approved","label":"Approved"},{"value":"approved_with_conditions","label":"Approved with conditions"},{"value":"withheld","label":"Withheld"},{"value":"rejected","label":"Rejected"},{"value":"pending","label":"Pending"}]'),
  ('decision_date', 'Decision Date', 'date', 13, 'Decision', NULL),
  ('decision_comments', 'Decision Comments', 'multi_line', 14, 'Decision', NULL),
  ('notes', 'Notes', 'multi_line', 15, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000016'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"signed_off","label":"Signed Off"},{"key":"signed_off_conditions","label":"Signed Off with Conditions"},{"key":"withheld","label":"Withheld"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000016'::uuid;

-- Product lists: copied from Data Scope.
UPDATE public.local_register_fields f
SET dropdown_options = s.dropdown_options, updated_at = NOW()
FROM public.local_register_fields s
WHERE s.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND s.field_key = 'product_area'
  AND ((f.register_id = '00000000-0000-4000-9001-000000000011'::uuid AND f.field_key = 'product_area')
       OR (f.register_id = '00000000-0000-4000-9001-000000000012'::uuid AND f.field_key = 'applies_to')
       OR (f.register_id = '00000000-0000-4000-9001-000000000014'::uuid AND f.field_key = 'product_area')
       OR (f.register_id = '00000000-0000-4000-9001-000000000015'::uuid AND f.field_key = 'product_area')
       OR (f.register_id = '00000000-0000-4000-9001-000000000016'::uuid AND f.field_key = 'products_covered'));

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9001-000000000011', '00000000-0000-4000-9001-000000000012', '00000000-0000-4000-9001-000000000013', '00000000-0000-4000-9001-000000000014', '00000000-0000-4000-9001-000000000015', '00000000-0000-4000-9001-000000000016')
GROUP BY r.register_key ORDER BY r.register_key;
