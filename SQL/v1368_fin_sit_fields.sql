-- ============================================================================
-- v1368: SIT — System Integration Testing (FIN pack, Testing & Assurance) — full form with tabs
-- ============================================================================
-- Owner request 2026-11-09: the SIT form only had Title / Description / Status. Each record is one
-- SIT cycle (its workflow is Plan → Cases → Execution → Defects → Complete). Tabs (field_group = tab;
-- ungrouped fields stay on Details):
--   Details             — SIT reference, cycle, functional area (Data Scope list), test lead,
--                         environment, build / release under test, planned and actual dates
--   Scope & Interfaces  — integration flows (table: flow, source, target, interface type ▾,
--                         priority ▾), in scope, out of scope, requirements covered
--   Entry & Readiness   — entry criteria, readiness checks (table: check, owner, status ▾),
--                         environment / interfaces / test data ready
--   Test Cases          — total and automated cases, test sets (table: test set, cases, priority ▾, owner)
--   Execution           — executed, passed, failed, blocked, not run, pass rate %, daily
--                         execution log (table)
--   Defects             — open defects by severity, key defects (table: reference, summary,
--                         severity ▾, status ▾, owner)
--   Exit & Sign-Off     — exit criteria, met, test summary report, signed off by / date, comments
--   Notes               — risks and issues (table: risk / issue, impact, mitigation, owner), notes
-- Lists whose lines split into parts are tables (rule 67.1). Existing status keys kept. All fields
-- optional, vendor-neutral (rule 26). Platform register definition; the Simulator reads the same
-- system register definitions. No records exist for this register yet, so there is no seed.
-- Prerequisites: v947 (register), v1297 (tabs), v1326 (table type), v1338 (Data Scope products),
-- v1351 (dropdown columns in tables). Idempotent.
-- ============================================================================

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000017'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  -- Details
  ('sit_reference', 'SIT Reference', 'text', 0, NULL, NULL),
  ('sit_cycle', 'Cycle', 'dropdown', 1, NULL, '[{"value":"cycle_1","label":"Cycle 1"},{"value":"cycle_2","label":"Cycle 2"},{"value":"cycle_3","label":"Cycle 3"},{"value":"regression","label":"Regression"}]'),
  ('functional_area', 'Functional Area', 'dropdown', 2, NULL, NULL),
  ('test_lead', 'Test Lead', 'user_picker', 3, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 4, NULL, '[{"value":"sit","label":"SIT"},{"value":"sit_2","label":"SIT 2"},{"value":"pre_production","label":"Pre-production"}]'),
  ('build_under_test', 'Build / Release Under Test', 'text', 5, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 6, NULL, NULL),
  ('planned_end', 'Planned End', 'date', 7, NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 8, NULL, NULL),
  ('actual_end', 'Actual End', 'date', 9, NULL, NULL),

  -- Scope & Interfaces
  ('integration_flows', 'Integration Flows', 'table', 10, 'Scope & Interfaces', '[{"value":"flow","label":"Flow"},{"value":"source","label":"Source System"},{"value":"target","label":"Target System"},{"value":"interface_type","label":"Interface Type","type":"select","options":["Real-time API","Message queue","File / batch","Database link","Screen / manual"]},{"value":"priority","label":"Priority","type":"select","options":["High","Medium","Low"]}]'),
  ('in_scope', 'In Scope', 'multi_line', 11, 'Scope & Interfaces', NULL),
  ('out_of_scope', 'Out of Scope', 'multi_line', 12, 'Scope & Interfaces', NULL),
  ('requirements_covered', 'Requirements Covered', 'text', 13, 'Scope & Interfaces', NULL),

  -- Entry & Readiness
  ('entry_criteria', 'Entry Criteria', 'multi_line', 14, 'Entry & Readiness', NULL),
  ('readiness_checks', 'Readiness Checks', 'table', 15, 'Entry & Readiness', '[{"value":"check","label":"Check"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Not started","In progress","Done"]}]'),
  ('environment_ready', 'Environment Ready', 'boolean', 16, 'Entry & Readiness', NULL),
  ('interfaces_connected', 'Interfaces Connected', 'boolean', 17, 'Entry & Readiness', NULL),
  ('test_data_ready', 'Test Data Ready', 'boolean', 18, 'Entry & Readiness', NULL),

  -- Test Cases
  ('total_cases', 'Total Test Cases', 'number', 19, 'Test Cases', NULL),
  ('automated_cases', 'Automated Test Cases', 'number', 20, 'Test Cases', NULL),
  ('test_sets', 'Test Sets', 'table', 21, 'Test Cases', '[{"value":"test_set","label":"Test Set / Scenario"},{"value":"cases","label":"Cases"},{"value":"priority","label":"Priority","type":"select","options":["High","Medium","Low"]},{"value":"owner","label":"Owner"}]'),

  -- Execution
  ('executed', 'Executed', 'number', 22, 'Execution', NULL),
  ('passed', 'Passed', 'number', 23, 'Execution', NULL),
  ('failed', 'Failed', 'number', 24, 'Execution', NULL),
  ('blocked', 'Blocked', 'number', 25, 'Execution', NULL),
  ('not_run', 'Not Run', 'number', 26, 'Execution', NULL),
  ('pass_rate', 'Pass Rate (%)', 'number', 27, 'Execution', NULL),
  ('execution_log', 'Execution Log', 'table', 28, 'Execution', '[{"value":"date","label":"Date","type":"date"},{"value":"executed","label":"Executed"},{"value":"passed","label":"Passed"},{"value":"failed","label":"Failed"},{"value":"blocked","label":"Blocked"},{"value":"comment","label":"Comment"}]'),

  -- Defects
  ('open_critical', 'Open Critical Defects', 'number', 29, 'Defects', NULL),
  ('open_high', 'Open High Defects', 'number', 30, 'Defects', NULL),
  ('open_medium', 'Open Medium Defects', 'number', 31, 'Defects', NULL),
  ('open_low', 'Open Low Defects', 'number', 32, 'Defects', NULL),
  ('key_defects', 'Key Defects', 'table', 33, 'Defects', '[{"value":"reference","label":"Defect Ref"},{"value":"summary","label":"Summary"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Fixed","Retest","Closed"]},{"value":"owner","label":"Owner"}]'),

  -- Exit & Sign-Off
  ('exit_criteria', 'Exit Criteria', 'multi_line', 34, 'Exit & Sign-Off', NULL),
  ('exit_criteria_met', 'Exit Criteria Met', 'boolean', 35, 'Exit & Sign-Off', NULL),
  ('test_summary_report', 'Test Summary Report Reference', 'text', 36, 'Exit & Sign-Off', NULL),
  ('signed_off_by', 'Signed Off By', 'user_picker', 37, 'Exit & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 38, 'Exit & Sign-Off', NULL),
  ('sign_off_comments', 'Sign-Off Comments', 'multi_line', 39, 'Exit & Sign-Off', NULL),

  -- Notes
  ('risks_issues', 'Risks and Issues', 'table', 40, 'Notes', '[{"value":"item","label":"Risk / Issue"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('notes', 'Notes', 'multi_line', 41, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000017'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label,
  field_type = EXCLUDED.field_type,
  display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group,
  dropdown_options = EXCLUDED.dropdown_options,
  updated_at = NOW();

-- Functional Area uses the Data Scope product list.
UPDATE public.local_register_fields f
SET dropdown_options = s.dropdown_options, updated_at = NOW()
FROM public.local_register_fields s
WHERE f.register_id = '00000000-0000-4000-9001-000000000017'::uuid AND f.field_key = 'functional_area'
  AND s.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND s.field_key = 'product_area';

-- Check: fields per tab.
SELECT COALESCE(field_group, 'Details') AS tab, count(*) AS fields
FROM public.local_register_fields
WHERE register_id = '00000000-0000-4000-9001-000000000017'::uuid
GROUP BY 1 ORDER BY min(display_order);
