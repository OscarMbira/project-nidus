-- ============================================================================
-- v1370: Sanity Checks (FIN pack, Testing & Assurance) — full form with tabs
-- ============================================================================
-- Owner request 2026-11-09: the Sanity Checks form only had Title / Description / Status. Each record is
-- one sanity (smoke) check run — on a new build, an environment or test-data refresh, a post-deployment
-- change or a phase entry gate. Tabs (field_group = tab; ungrouped fields stay on Details):
--   Details             — check reference, check type, build / release, environment, functional area
--                         (Data Scope list), run date, run by
--   Check Results       — checks (table: check, area, expected result, result ▾, comment), total / passed /
--                         failed / blocked
--   Environment & Data  — configuration / parameter version, test data snapshot, interfaces checked
--                         (table: interface, status ▾, comment)
--   Outcome             — outcome (accepted / with known issues / rejected / pending), defects raised
--                         (table: reference, summary, severity ▾), decision by, decision date, next action
--   Notes
-- Status workflow gains Rejected (existing keys kept). Lists with several parts per line are tables
-- (rule 67.1). All fields optional; vendor-neutral (rule 26). Platform register definition; the Simulator
-- reads the same system register definitions. Sample records: v1371.
-- Prerequisites: v947 (register), v1297 (tabs), v1326 (table type), v1338 (Data Scope products), v1351
-- (dropdown columns). Idempotent.
-- ============================================================================

INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000040'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('check_reference', 'Check Reference', 'text', 0, NULL, NULL),
  ('check_type', 'Check Type', 'dropdown', 1, NULL, '[{"value":"build_acceptance","label":"New build acceptance"},{"value":"environment_refresh","label":"Environment refresh"},{"value":"post_deployment","label":"Post-deployment check"},{"value":"data_refresh","label":"Test data refresh"},{"value":"phase_gate","label":"Phase entry gate"}]'),
  ('build_under_test', 'Build / Release', 'text', 2, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 3, NULL, '[{"value":"test","label":"Test"},{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"}]'),
  ('functional_area', 'Functional Area', 'dropdown', 4, NULL, NULL),
  ('run_date', 'Run Date', 'date', 5, NULL, NULL),
  ('run_by', 'Run By', 'user_picker', 6, NULL, NULL),
  ('checks', 'Checks', 'table', 7, 'Check Results', '[{"value":"check","label":"Check"},{"value":"area","label":"Area"},{"value":"expected","label":"Expected Result"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Blocked","Not run"]},{"value":"comment","label":"Comment"}]'),
  ('total_checks', 'Total Checks', 'number', 8, 'Check Results', NULL),
  ('passed', 'Passed', 'number', 9, 'Check Results', NULL),
  ('failed', 'Failed', 'number', 10, 'Check Results', NULL),
  ('blocked', 'Blocked', 'number', 11, 'Check Results', NULL),
  ('configuration_version', 'Configuration / Parameter Version', 'text', 12, 'Environment & Data', NULL),
  ('data_snapshot', 'Test Data Snapshot', 'text', 13, 'Environment & Data', NULL),
  ('interfaces_checked', 'Interfaces Checked', 'table', 14, 'Environment & Data', '[{"value":"interface","label":"Interface"},{"value":"status","label":"Status","type":"select","options":["Connected","Down","Not checked"]},{"value":"comment","label":"Comment"}]'),
  ('outcome', 'Outcome', 'dropdown', 15, 'Outcome', '[{"value":"accepted","label":"Accepted for testing"},{"value":"accepted_with_issues","label":"Accepted with known issues"},{"value":"rejected","label":"Rejected – build returned"},{"value":"pending","label":"Pending"}]'),
  ('blocking_defects', 'Defects Raised', 'table', 16, 'Outcome', '[{"value":"reference","label":"Defect Ref"},{"value":"summary","label":"Summary"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]}]'),
  ('decision_by', 'Decision By', 'user_picker', 17, 'Outcome', NULL),
  ('decision_date', 'Decision Date', 'date', 18, 'Outcome', NULL),
  ('next_action', 'Next Action', 'multi_line', 19, 'Outcome', NULL),
  ('notes', 'Notes', 'multi_line', 20, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000040'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

-- Functional Area uses the Data Scope product list.
UPDATE public.local_register_fields f
SET dropdown_options = s.dropdown_options, updated_at = NOW()
FROM public.local_register_fields s
WHERE f.register_id = '00000000-0000-4000-9001-000000000040'::uuid AND f.field_key = 'functional_area'
  AND s.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND s.field_key = 'product_area';

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"rejected","label":"Rejected"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000040'::uuid;

-- Check: fields per tab.
SELECT COALESCE(field_group, 'Details') AS tab, count(*) AS fields
FROM public.local_register_fields WHERE register_id = '00000000-0000-4000-9001-000000000040'::uuid
GROUP BY 1 ORDER BY min(display_order);
