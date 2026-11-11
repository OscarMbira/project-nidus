-- ============================================================================
-- v1376: Data Migration Runbook — Migration Runbook + Runbook Steps registers, menus, role access
-- ============================================================================
-- PRD: projectprd/v1337_cbs_data_migration_runbook_PRD.md (D1–D4, D7–D9)
-- Plan: projectplan/v1337_cbs_data_migration_runbook_plan.md (slice 4). Requires v947, v1343, v1346,
-- v1359, v1375. No new tables (records live in local_register_records). Idempotent.
--
--   fin_migration_runbook  (9001-…042) — one record per migration run: the mock / rehearsal it belongs
--       to, windows and budgets, go / no-go checkpoints, backups and the final decision. Its page shows
--       the live run summary and the ordered step list (behaviour.type = 'runbook').
--   fin_runbook_steps      (9001-…043) — one record per step: window, batch, run order, step type, load
--       figures (received / loaded → failed, % success, throughput worked out on save), timings
--       (start / end → time taken and variance against budget), control instructions, checkpoint
--       decision, defects. Starting or finishing a step out of order warns and asks for a reason
--       (behaviour.type = 'runbook_steps'). Type-specific tabs use visible_when.
--   Mock Migrations shows each linked runbook's progress (behaviour.type = 'runbook_progress').
-- Menus: Data Migration → Migration Runbook (638) and Runbook Steps (639), after Mock Migrations;
-- Reconciliations / Migration Defects / Migration Sign-Off move to 640–642. Role access as v1343.
-- ============================================================================

BEGIN;

-- ── 1. Registers ─────────────────────────────────────────────────────────────
INSERT INTO public.local_registers (id, register_key, label, icon, description, scope_level, account_id, status_workflow,
                                    behaviour, is_system_defined, is_active, created_at, updated_at)
VALUES
  ('00000000-0000-4000-9001-000000000042', 'fin_migration_runbook', 'Migration Runbook', 'list-checks',
   'Run-by-run data migration runbook: windows, budgets, checkpoints, backups and the go / no-go decision',
   'project', NULL,
   '[{"key":"planned","label":"Planned"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"aborted","label":"Aborted"}]'::jsonb,
   '{"type":"runbook","templates":true,"template_children":[{"register_key":"fin_runbook_steps","field_key":"runbook"}]}'::jsonb,
   TRUE, TRUE, NOW(), NOW()),
  ('00000000-0000-4000-9001-000000000043', 'fin_runbook_steps', 'Runbook Steps', 'list-checks',
   'Ordered runbook steps: loads, transformations, configuration changes, backups, validations and checkpoints with actual figures and timings',
   'project', NULL,
   '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"done","label":"Done"},{"key":"failed","label":"Failed"},{"key":"blocked","label":"Blocked"},{"key":"skipped","label":"Skipped"}]'::jsonb,
   '{"type":"runbook_steps"}'::jsonb,
   TRUE, TRUE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  register_key = EXCLUDED.register_key, label = EXCLUDED.label, description = EXCLUDED.description,
  status_workflow = EXCLUDED.status_workflow, behaviour = EXCLUDED.behaviour, is_active = TRUE, updated_at = NOW();

UPDATE public.local_registers
SET behaviour = '{"type":"runbook_progress"}'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000013'::uuid;

-- ── 2. Migration Runbook fields ──────────────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, visible_when, calculation)
SELECT '00000000-0000-4000-9001-000000000042'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group,
       v.dropdown_options::jsonb, v.visible_when::jsonb, v.calculation::jsonb
FROM (VALUES
  -- Details
  ('run_reference', 'Run Reference', 'text', 0, NULL, NULL, NULL, NULL),
  ('mock_migration', 'Mock Migration', 'record_ref', 1, NULL,
   '[{"value":"fin_mock_migrations","label":"Mock Migrations","show_fields":["mock_round","environment"]}]', NULL, NULL),
  ('run_type', 'Run Type', 'dropdown', 2, NULL,
   '[{"value":"mock","label":"Mock migration"},{"value":"dress_rehearsal","label":"Dress rehearsal"},{"value":"go_live","label":"Go-live migration"}]', NULL, NULL),
  ('migration_window', 'Migration Window', 'dropdown', 3, NULL,
   '[{"value":"static","label":"Static data"},{"value":"financial","label":"Financial data"},{"value":"full","label":"Full scope"}]', NULL, NULL),
  ('environment', 'Environment', 'dropdown', 4, NULL,
   '[{"value":"sit","label":"System integration test"},{"value":"uat","label":"User acceptance test"},{"value":"pre_production","label":"Pre-production"},{"value":"production","label":"Production"}]', NULL, NULL),
  ('migration_lead', 'Migration Lead', 'user_picker', 5, NULL, NULL, NULL, NULL),
  ('cutover_manager', 'Cutover Manager', 'user_picker', 6, NULL, NULL, NULL, NULL),
  ('source_data_as_at', 'Source Data As At', 'date', 7, NULL, NULL, NULL, NULL),
  ('runbook_version', 'Runbook Version', 'text', 8, NULL, NULL, NULL, NULL),
  -- Windows & Budgets
  ('data_freeze_at', 'Source Data Freeze', 'datetime', 10, 'Windows & Budgets', NULL, NULL, NULL),
  ('static_window_start', 'Static Window Start', 'datetime', 11, 'Windows & Budgets', NULL, NULL, NULL),
  ('static_window_end', 'Static Window End', 'datetime', 12, 'Windows & Budgets', NULL, NULL, NULL),
  ('static_budget_minutes', 'Static Window Budget (minutes)', 'number', 13, 'Windows & Budgets', NULL, NULL, NULL),
  ('static_window_minutes', 'Static Window Time Taken', 'number', 14, 'Windows & Budgets', NULL, NULL,
   '{"op":"minutes_between","start":"static_window_start","end":"static_window_end","display":"duration"}'),
  ('financial_window_start', 'Financial Window Start', 'datetime', 15, 'Windows & Budgets', NULL, NULL, NULL),
  ('financial_window_end', 'Financial Window End', 'datetime', 16, 'Windows & Budgets', NULL, NULL, NULL),
  ('financial_budget_minutes', 'Financial Window Budget (minutes)', 'number', 17, 'Windows & Budgets', NULL, NULL, NULL),
  ('financial_window_minutes', 'Financial Window Time Taken', 'number', 18, 'Windows & Budgets', NULL, NULL,
   '{"op":"minutes_between","start":"financial_window_start","end":"financial_window_end","display":"duration"}'),
  ('business_resumption_at', 'Business Resumption Deadline', 'datetime', 19, 'Windows & Budgets', NULL, NULL, NULL),
  -- Checkpoints & Backups
  ('go_no_go_points', 'Go / No-Go Checkpoints', 'table', 20, 'Checkpoints & Backups',
   '[{"value":"checkpoint","label":"Checkpoint"},{"value":"planned_at","label":"Planned Time"},{"value":"decision","label":"Decision","type":"select","options":["Pending","Proceed","Proceed with conditions","Stop"]},{"value":"decided_by","label":"Decided By"}]', NULL, NULL),
  ('backups', 'Backups', 'table', 21, 'Checkpoints & Backups',
   '[{"value":"backup","label":"Backup"},{"value":"taken_at","label":"Taken At"},{"value":"reference","label":"Reference / Location"},{"value":"verified","label":"Restore Verified","type":"select","options":["Yes","No","Not tested"]}]', NULL, NULL),
  ('rollback_trigger', 'Rollback Trigger', 'multi_line', 22, 'Checkpoints & Backups', NULL, NULL, NULL),
  ('rollback_point', 'Rollback Point (latest backup to restore)', 'text', 23, 'Checkpoints & Backups', NULL, NULL, NULL),
  -- Go / No-Go
  ('final_decision', 'Final Decision', 'dropdown', 30, 'Go / No-Go',
   '[{"value":"pending","label":"Pending"},{"value":"go","label":"Go"},{"value":"go_with_conditions","label":"Go with conditions"},{"value":"no_go","label":"No-go (roll back)"}]', NULL, NULL),
  ('decision_at', 'Decision Time', 'datetime', 31, 'Go / No-Go', NULL, NULL, NULL),
  ('decided_by', 'Decided By', 'user_picker', 32, 'Go / No-Go', NULL, NULL, NULL),
  ('decision_conditions', 'Conditions', 'multi_line', 33, 'Go / No-Go', NULL,
   '{"field":"final_decision","in":["go_with_conditions"]}', NULL),
  ('decision_rationale', 'Decision Rationale', 'long_text', 34, 'Go / No-Go', NULL, NULL, NULL),
  -- Notes
  ('lessons_learned', 'Lessons Learned', 'multi_line', 40, 'Notes', NULL, NULL, NULL),
  ('runbook_changes', 'Changes for the Next Run', 'multi_line', 41, 'Notes', NULL, NULL, NULL),
  ('notes', 'Notes', 'multi_line', 42, 'Notes', NULL, NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, visible_when, calculation)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options,
  visible_when = EXCLUDED.visible_when, calculation = EXCLUDED.calculation, updated_at = NOW();

-- ── 3. Runbook Steps fields ──────────────────────────────────────────────────
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, visible_when, calculation)
SELECT '00000000-0000-4000-9001-000000000043'::uuid, v.field_key, v.field_label, v.field_type, v.is_required, v.display_order, v.field_group,
       v.dropdown_options::jsonb, v.visible_when::jsonb, v.calculation::jsonb
FROM (VALUES
  -- Details
  ('runbook', 'Runbook', 'record_ref', TRUE, 0, NULL,
   '[{"value":"fin_migration_runbook","label":"Migration Runbook"}]', NULL, NULL),
  ('window', 'Window', 'dropdown', TRUE, 1, NULL,
   '[{"value":"preparation","label":"Preparation"},{"value":"static","label":"Static window"},{"value":"financial","label":"Financial window"},{"value":"post_migration","label":"Post-migration"}]', NULL, NULL),
  ('batch', 'Batch', 'dropdown', FALSE, 2, NULL,
   '[{"value":"pre_migration","label":"Pre-migration"},{"value":"static_data","label":"Static data"},{"value":"balance_sheet","label":"Balance sheet"},{"value":"conventional_products","label":"Conventional products"},{"value":"islamic_products","label":"Islamic products"},{"value":"internal_nostro","label":"Internal and nostro accounts"},{"value":"trade_finance","label":"Trade finance"},{"value":"dynamic_data","label":"Dynamic data"},{"value":"post_migration","label":"Post-migration"}]', NULL, NULL),
  ('sequence', 'Run Order', 'number', TRUE, 3, NULL, NULL, NULL, NULL),
  ('step_type', 'Step Type', 'dropdown', TRUE, 4, NULL,
   '[{"value":"load","label":"Load"},{"value":"transformation","label":"Transformation"},{"value":"configuration_change","label":"Configuration change"},{"value":"backup","label":"Backup"},{"value":"extract_report","label":"Extract / report"},{"value":"validation","label":"Validation / reconciliation"},{"value":"checkpoint","label":"Checkpoint / sign-off"},{"value":"service","label":"Service start / stop"}]', NULL, NULL),
  ('owner', 'Owner', 'user_picker', FALSE, 5, NULL, NULL, NULL, NULL),
  ('can_run_in_parallel', 'Can Run in Parallel', 'boolean', FALSE, 6, NULL, NULL, NULL, NULL),
  ('depends_on', 'Depends On (steps)', 'multi_line', FALSE, 7, NULL, NULL, NULL, NULL),
  -- Load Figures (loads and transformations)
  ('data_set', 'Data Set', 'text', FALSE, 10, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}', NULL),
  ('load_object', 'Load Object / Target Table', 'text', FALSE, 11, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}', NULL),
  ('mapping_sheet', 'Mapping Sheet', 'record_ref', FALSE, 12, 'Load Figures',
   '[{"value":"fin_data_mapping","label":"Data Mapping","show_fields":["expected_record_count"]}]', '{"field":"step_type","in":["load","transformation"]}', NULL),
  ('agents', 'Agents / Threads', 'number', FALSE, 13, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}', NULL),
  ('handoff_received', 'Hand-off File Received', 'boolean', FALSE, 14, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}', NULL),
  ('records_received', 'Records Received', 'number', FALSE, 15, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}', NULL),
  ('records_loaded', 'Records Loaded', 'number', FALSE, 16, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}', NULL),
  ('records_failed', 'Records Failed', 'number', FALSE, 17, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}',
   '{"op":"difference","minuend":"records_received","subtrahend":"records_loaded"}'),
  ('success_percent', '% Success', 'number', FALSE, 18, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}',
   '{"op":"percent","numerator":"records_loaded","denominator":"records_received","decimals":2,"display":"percent"}'),
  ('throughput_per_second', 'Throughput (records / second)', 'number', FALSE, 19, 'Load Figures', NULL, '{"field":"step_type","in":["load","transformation"]}',
   '{"op":"per_second","count":"records_loaded","start":"start_at","end":"end_at","decimals":1}'),
  -- Timing
  ('start_at', 'Start', 'datetime', FALSE, 20, 'Timing', NULL, NULL, NULL),
  ('end_at', 'End', 'datetime', FALSE, 21, 'Timing', NULL, NULL, NULL),
  ('time_taken_minutes', 'Time Taken', 'number', FALSE, 22, 'Timing', NULL, NULL,
   '{"op":"minutes_between","start":"start_at","end":"end_at","display":"duration"}'),
  ('budget_minutes', 'Budget (minutes)', 'number', FALSE, 23, 'Timing', NULL, NULL, NULL),
  ('budget_variance_minutes', 'Over / Under Budget', 'number', FALSE, 24, 'Timing', NULL, NULL,
   '{"op":"difference","minuend":"time_taken_minutes","subtrahend":"budget_minutes","display":"duration"}'),
  ('extraction_start_at', 'Extraction Start', 'datetime', FALSE, 25, 'Timing', NULL, '{"field":"step_type","in":["load","transformation","extract_report"]}', NULL),
  ('extraction_end_at', 'Extraction End', 'datetime', FALSE, 26, 'Timing', NULL, '{"field":"step_type","in":["load","transformation","extract_report"]}', NULL),
  ('extraction_minutes', 'Extraction Time', 'number', FALSE, 27, 'Timing', NULL, '{"field":"step_type","in":["load","transformation","extract_report"]}',
   '{"op":"minutes_between","start":"extraction_start_at","end":"extraction_end_at","display":"duration"}'),
  ('validation_start_at', 'Validation Start', 'datetime', FALSE, 28, 'Timing', NULL, '{"field":"step_type","in":["load","transformation","validation"]}', NULL),
  ('validation_end_at', 'Validation End', 'datetime', FALSE, 29, 'Timing', NULL, '{"field":"step_type","in":["load","transformation","validation"]}', NULL),
  ('validation_minutes', 'Validation Time', 'number', FALSE, 30, 'Timing', NULL, '{"field":"step_type","in":["load","transformation","validation"]}',
   '{"op":"minutes_between","start":"validation_start_at","end":"validation_end_at","display":"duration"}'),
  -- Control (configuration changes, backups, extracts, validations, services)
  ('instruction', 'Instruction', 'long_text', FALSE, 40, 'Control', NULL,
   '{"field":"step_type","in":["configuration_change","backup","extract_report","validation","service"]}', NULL),
  ('control_reference', 'Reference (backup / report / change)', 'text', FALSE, 41, 'Control', NULL,
   '{"field":"step_type","in":["configuration_change","backup","extract_report","validation","service"]}', NULL),
  ('done_by', 'Done By', 'user_picker', FALSE, 42, 'Control', NULL,
   '{"field":"step_type","in":["configuration_change","backup","extract_report","validation","service"]}', NULL),
  ('verified_by', 'Verified By', 'user_picker', FALSE, 43, 'Control', NULL,
   '{"field":"step_type","in":["configuration_change","backup","extract_report","validation","service"]}', NULL),
  -- Checkpoint
  ('checkpoint_decision', 'Checkpoint Decision', 'dropdown', FALSE, 50, 'Checkpoint',
   '[{"value":"pending","label":"Pending"},{"value":"proceed","label":"Proceed"},{"value":"proceed_with_conditions","label":"Proceed with conditions"},{"value":"stop","label":"Stop"}]',
   '{"field":"step_type","in":["checkpoint"]}', NULL),
  ('decided_by', 'Decided By', 'user_picker', FALSE, 51, 'Checkpoint', NULL, '{"field":"step_type","in":["checkpoint"]}', NULL),
  ('decision_notes', 'Decision Notes', 'multi_line', FALSE, 52, 'Checkpoint', NULL, '{"field":"step_type","in":["checkpoint"]}', NULL),
  -- Defects
  ('defects', 'Migration Defects', 'record_ref', FALSE, 60, 'Defects',
   '[{"value":"fin_migration_defects","label":"Migration Defects","multiple":true}]', NULL, NULL),
  -- Notes
  ('sequence_override_reason', 'Out-of-Order Reasons', 'table', FALSE, 70, 'Notes',
   '[{"value":"at","label":"When (UTC)"},{"value":"by","label":"By"},{"value":"reason","label":"Reason"}]', NULL, NULL),
  ('notes', 'Notes', 'multi_line', FALSE, 71, 'Notes', NULL, NULL, NULL)
) AS v(field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, visible_when, calculation)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order, field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options,
  visible_when = EXCLUDED.visible_when, calculation = EXCLUDED.calculation, updated_at = NOW();

-- ── 4. Banking & Financial Services pack ─────────────────────────────────────
INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Banking & Financial Services'
)
WHERE lr.id IN ('00000000-0000-4000-9001-000000000042'::uuid, '00000000-0000-4000-9001-000000000043'::uuid)
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

-- ── 5. Menus: after Mock Migrations (637); later items move down ────────────
UPDATE public.menu_items SET sort_order = 640, updated_at = NOW() WHERE menu_code = 'fin_reg_fin_reconciliations';
UPDATE public.menu_items SET sort_order = 641, updated_at = NOW() WHERE menu_code = 'fin_reg_fin_migration_defects';
UPDATE public.menu_items SET sort_order = 642, updated_at = NOW() WHERE menu_code = 'fin_reg_fin_migration_sign_off';

INSERT INTO public.menu_items (id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
                               methodology, menu_icon, is_active, is_visible, created_at, updated_at)
SELECT gen_random_uuid(), 'fin_reg_' || lr.register_key, lr.label, lr.description,
       '/platform/local-registers/' || lr.id::text,
       (SELECT id FROM public.menu_items WHERE menu_code = 'fin_cat_data_migration' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, v.sort_order, 'universal', 'list-checks', TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-000000000042', 638),
  ('00000000-0000-4000-9001-000000000043', 639)
) AS v(register_id, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label, menu_description = EXCLUDED.menu_description, route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id, sort_order = EXCLUDED.sort_order,
  is_visible = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 6. Role access: the delivery-team group (v946c) plus the v1343 strategy participants ──
SELECT public.grant_menu_role_group('fin_reg_%');

WITH target_roles AS (
  SELECT id
  FROM public.roles
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND account_id IS NULL
    AND lower(regexp_replace(trim(role_name), '[[:space:]]+', '_', 'g')) IN (
      'financial_programme_manager', 'project_sponsor', 'project_board_member', 'pm_project_assurance',
      'internal_auditor', 'risk_compliance_manager', 'financial_analyst', 'data_analyst', 'data_engineer',
      'pm_team_member'
    )
),
target_items AS (
  SELECT id FROM public.menu_items
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND menu_code IN ('fin_reg_fin_migration_runbook', 'fin_reg_fin_runbook_steps')
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.id, TRUE, TRUE, TRUE, FALSE, NOW(), NOW()
FROM target_roles r CROSS JOIN target_items m
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- ── 7. industry_pack_menu_items (v945 pattern) ───────────────────────────────
INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.route_path = '/platform/local-registers/' || lr.id::text
WHERE lr.id IN ('00000000-0000-4000-9001-000000000042'::uuid, '00000000-0000-4000-9001-000000000043'::uuid)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

COMMIT;

-- Check: two registers with their fields, the Data Migration menu order, and role counts.
SELECT lr.register_key, lr.behaviour ->> 'type' AS behaviour, count(f.id) AS fields,
       count(f.id) FILTER (WHERE f.calculation IS NOT NULL) AS calculated,
       count(f.id) FILTER (WHERE f.field_type IN ('datetime', 'record_ref')) AS datetime_or_ref
FROM public.local_registers lr
LEFT JOIN public.local_register_fields f ON f.register_id = lr.id
WHERE lr.id IN ('00000000-0000-4000-9001-000000000042'::uuid, '00000000-0000-4000-9001-000000000043'::uuid, '00000000-0000-4000-9001-000000000013'::uuid)
GROUP BY lr.register_key, lr.behaviour
ORDER BY lr.register_key;

SELECT mi.sort_order, mi.menu_code, mi.menu_label,
       (SELECT count(*) FROM public.role_menu_items rmi WHERE rmi.menu_item_id = mi.id AND rmi.can_view AND rmi.is_active
          AND COALESCE(rmi.is_deleted, FALSE) = FALSE) AS roles
FROM public.menu_items mi
WHERE mi.parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'fin_cat_data_migration' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ORDER BY mi.sort_order;
