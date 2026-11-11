-- ============================================================================
-- v1372: Testing & Assurance registers — full forms with tabs (UAT, Regression, Performance, Security,
--         DR Testing, Operational Readiness Testing) + Dress Rehearsal Strategy tables
-- ============================================================================
-- Owner request 2026-11-09: best-practice fields for the circled Testing & Assurance registers. Each of
-- the six activity registers holds one test run / activity per record, on a shared backbone — Details
-- (reference, type, functional area, environment, lead, planned / actual dates), Defects, Exit &
-- Sign-Off, Notes (risks table) — plus its own tabs:
--   UAT: Details · Scenarios · Execution · Exit & Sign-Off · Defects · Notes
--   Regression Testing: Details · Execution · Defects · Exit & Sign-Off · Notes
--   Performance Testing: Details · Targets & Results · Analysis · Defects · Exit & Sign-Off · Notes
--   Security Testing: Details · Scope · Findings · Defects · Exit & Sign-Off · Notes
--   DR Testing: Details · Recovery Objectives · Execution · Defects · Exit & Sign-Off · Notes
--   Operational Readiness Testing: Details · Scenarios · Readiness · Defects · Exit & Sign-Off · Notes
-- Dress Rehearsal Strategy (document register, fields from v1321): splittable lists become tables
-- (rule 67.1) — Risks and Mitigations, Roles and Responsibilities, Timing Targets, Participants — and a
-- Rehearsal Schedule table is added. No records exist for any of these registers, so no values convert.
-- Status workflows gain a closing / failure state (existing keys kept). Lists with several parts per
-- line are tables with dropdown columns where the values are a short fixed list. All fields optional;
-- vendor-neutral (rule 26). Platform register definitions; the Simulator reads the same system register
-- definitions. Sample records: v1373.
-- Prerequisites: v947, v1297, v1321 (document registers), v1326, v1338, v1351. Idempotent.
-- ============================================================================

-- ── UAT ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000018'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('uat_reference', 'Reference', 'text', 0, NULL, NULL),
  ('uat_round', 'UAT Round', 'dropdown', 1, NULL, '[{"value":"round_1","label":"Round 1"},{"value":"round_2","label":"Round 2"},{"value":"final","label":"Final acceptance"}]'),
  ('functional_area', 'Functional Area', 'dropdown', 2, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 3, NULL, '[{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"},{"value":"dr","label":"Disaster recovery site"},{"value":"production","label":"Production"}]'),
  ('lead', 'Lead', 'user_picker', 4, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 5, NULL, NULL),
  ('planned_end', 'Planned End', 'date', 6, NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 7, NULL, NULL),
  ('actual_end', 'Actual End', 'date', 8, NULL, NULL),
  ('business_unit', 'Business Unit', 'text', 9, NULL, NULL),
  ('business_scenarios', 'Business Scenarios', 'table', 10, 'Scenarios', '[{"value":"scenario","label":"Scenario"},{"value":"process","label":"Business Process"},{"value":"priority","label":"Priority","type":"select","options":["High","Medium","Low"]},{"value":"tester","label":"Business Tester"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Blocked","Not run"]}]'),
  ('testers', 'Business Testers', 'multi_line', 11, 'Scenarios', NULL),
  ('total_scenarios', 'Total Scenarios', 'number', 12, 'Execution', NULL),
  ('executed', 'Executed', 'number', 13, 'Execution', NULL),
  ('passed', 'Passed', 'number', 14, 'Execution', NULL),
  ('failed', 'Failed', 'number', 15, 'Execution', NULL),
  ('acceptance_decision', 'Acceptance Decision', 'dropdown', 16, 'Exit & Sign-Off', '[{"value":"accepted","label":"Accepted"},{"value":"accepted_with_conditions","label":"Accepted with conditions"},{"value":"rejected","label":"Rejected"},{"value":"pending","label":"Pending"}]'),
  ('acceptance_conditions', 'Conditions of Acceptance', 'multi_line', 17, 'Exit & Sign-Off', NULL),
  ('defects', 'Defects Raised', 'table', 18, 'Defects', '[{"value":"reference","label":"Ref"},{"value":"summary","label":"Summary"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Fixed","Retest","Closed"]},{"value":"owner","label":"Owner"}]'),
  ('exit_criteria', 'Exit Criteria', 'multi_line', 19, 'Exit & Sign-Off', NULL),
  ('exit_criteria_met', 'Exit Criteria Met', 'boolean', 20, 'Exit & Sign-Off', NULL),
  ('report_reference', 'Report Reference', 'text', 21, 'Exit & Sign-Off', NULL),
  ('signed_off_by', 'Signed Off By', 'user_picker', 22, 'Exit & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 23, 'Exit & Sign-Off', NULL),
  ('risks_issues', 'Risks and Issues', 'table', 24, 'Notes', '[{"value":"item","label":"Risk / Issue"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('notes', 'Notes', 'multi_line', 25, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000018'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"plan","label":"Plan"},{"key":"cases","label":"Cases"},{"key":"execution","label":"Execution"},{"key":"sign_off","label":"Sign-Off"},{"key":"accepted","label":"Accepted"},{"key":"rejected","label":"Rejected"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000018'::uuid;

-- ── Regression Testing ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000019'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('regression_reference', 'Reference', 'text', 0, NULL, NULL),
  ('regression_type', 'Regression Type', 'dropdown', 1, NULL, '[{"value":"full","label":"Full regression"},{"value":"targeted","label":"Targeted (changed areas)"},{"value":"automated_nightly","label":"Automated nightly run"}]'),
  ('functional_area', 'Functional Area', 'dropdown', 2, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 3, NULL, '[{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"},{"value":"dr","label":"Disaster recovery site"},{"value":"production","label":"Production"}]'),
  ('lead', 'Lead', 'user_picker', 4, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 5, NULL, NULL),
  ('planned_end', 'Planned End', 'date', 6, NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 7, NULL, NULL),
  ('actual_end', 'Actual End', 'date', 8, NULL, NULL),
  ('build_under_test', 'Build / Release', 'text', 9, NULL, NULL),
  ('pack_size', 'Pack Size (scenarios)', 'number', 10, 'Execution', NULL),
  ('automated_scenarios', 'Automated Scenarios', 'number', 11, 'Execution', NULL),
  ('executed', 'Executed', 'number', 12, 'Execution', NULL),
  ('passed', 'Passed', 'number', 13, 'Execution', NULL),
  ('failed', 'Failed', 'number', 14, 'Execution', NULL),
  ('pass_rate', 'Pass Rate (%)', 'number', 15, 'Execution', NULL),
  ('run_duration_hours', 'Run Duration (hours)', 'number', 16, 'Execution', NULL),
  ('area_results', 'Results by Area', 'table', 17, 'Execution', '[{"value":"area","label":"Area"},{"value":"scenarios","label":"Scenarios"},{"value":"failed","label":"Failed"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Blocked","Not run"]}]'),
  ('defects', 'Defects Raised', 'table', 18, 'Defects', '[{"value":"reference","label":"Ref"},{"value":"summary","label":"Summary"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Fixed","Retest","Closed"]},{"value":"owner","label":"Owner"}]'),
  ('exit_criteria', 'Exit Criteria', 'multi_line', 19, 'Exit & Sign-Off', NULL),
  ('exit_criteria_met', 'Exit Criteria Met', 'boolean', 20, 'Exit & Sign-Off', NULL),
  ('report_reference', 'Report Reference', 'text', 21, 'Exit & Sign-Off', NULL),
  ('signed_off_by', 'Signed Off By', 'user_picker', 22, 'Exit & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 23, 'Exit & Sign-Off', NULL),
  ('risks_issues', 'Risks and Issues', 'table', 24, 'Notes', '[{"value":"item","label":"Risk / Issue"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('notes', 'Notes', 'multi_line', 25, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000019'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"failed","label":"Failed – Rerun"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000019'::uuid;

-- ── Performance Testing ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000001a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('performance_reference', 'Reference', 'text', 0, NULL, NULL),
  ('test_type', 'Test Type', 'dropdown', 1, NULL, '[{"value":"load","label":"Load"},{"value":"stress","label":"Stress"},{"value":"endurance","label":"Endurance (soak)"},{"value":"spike","label":"Spike"},{"value":"volume","label":"Volume"},{"value":"batch","label":"Batch / close of business"}]'),
  ('functional_area', 'Functional Area', 'dropdown', 2, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 3, NULL, '[{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"},{"value":"dr","label":"Disaster recovery site"},{"value":"production","label":"Production"}]'),
  ('lead', 'Lead', 'user_picker', 4, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 5, NULL, NULL),
  ('planned_end', 'Planned End', 'date', 6, NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 7, NULL, NULL),
  ('actual_end', 'Actual End', 'date', 8, NULL, NULL),
  ('workload_model', 'Workload Model and Results', 'table', 9, 'Targets & Results', '[{"value":"transaction","label":"Transaction / Process"},{"value":"volume","label":"Target Volume"},{"value":"target","label":"Target"},{"value":"achieved","label":"Achieved"},{"value":"result","label":"Result","type":"select","options":["Met","Not met","Not run"]}]'),
  ('peak_users', 'Peak Concurrent Users', 'number', 10, 'Targets & Results', NULL),
  ('peak_tps', 'Peak Transactions per Second', 'number', 11, 'Targets & Results', NULL),
  ('max_cpu_percent', 'Max CPU (%)', 'number', 12, 'Targets & Results', NULL),
  ('batch_duration_hours', 'Batch Duration (hours)', 'number', 13, 'Targets & Results', NULL),
  ('bottlenecks', 'Bottlenecks Found', 'multi_line', 14, 'Analysis', NULL),
  ('tuning_actions', 'Tuning Actions', 'table', 15, 'Analysis', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Done"]}]'),
  ('defects', 'Defects Raised', 'table', 16, 'Defects', '[{"value":"reference","label":"Ref"},{"value":"summary","label":"Summary"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Fixed","Retest","Closed"]},{"value":"owner","label":"Owner"}]'),
  ('exit_criteria', 'Exit Criteria', 'multi_line', 17, 'Exit & Sign-Off', NULL),
  ('exit_criteria_met', 'Exit Criteria Met', 'boolean', 18, 'Exit & Sign-Off', NULL),
  ('report_reference', 'Report Reference', 'text', 19, 'Exit & Sign-Off', NULL),
  ('signed_off_by', 'Signed Off By', 'user_picker', 20, 'Exit & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 21, 'Exit & Sign-Off', NULL),
  ('risks_issues', 'Risks and Issues', 'table', 22, 'Notes', '[{"value":"item","label":"Risk / Issue"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('notes', 'Notes', 'multi_line', 23, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000001a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"failed","label":"Targets Not Met"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000001a'::uuid;

-- ── Security Testing ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000001b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('security_reference', 'Reference', 'text', 0, NULL, NULL),
  ('test_type', 'Test Type', 'dropdown', 1, NULL, '[{"value":"penetration","label":"Penetration test"},{"value":"vulnerability_scan","label":"Vulnerability scan"},{"value":"access_review","label":"User access / role review"},{"value":"configuration_review","label":"Configuration review"},{"value":"code_review","label":"Secure code review"}]'),
  ('functional_area', 'Functional Area', 'dropdown', 2, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 3, NULL, '[{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"},{"value":"dr","label":"Disaster recovery site"},{"value":"production","label":"Production"}]'),
  ('lead', 'Lead', 'user_picker', 4, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 5, NULL, NULL),
  ('planned_end', 'Planned End', 'date', 6, NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 7, NULL, NULL),
  ('actual_end', 'Actual End', 'date', 8, NULL, NULL),
  ('tested_by', 'Tested By', 'dropdown', 9, NULL, '[{"value":"internal","label":"Internal security team"},{"value":"independent","label":"Independent third party"}]'),
  ('systems_tested', 'Systems Tested', 'multi_line', 10, 'Scope', NULL),
  ('findings', 'Findings', 'table', 11, 'Findings', '[{"value":"reference","label":"Ref"},{"value":"finding","label":"Finding"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","Remediated","Retest","Risk accepted"]},{"value":"owner","label":"Owner"}]'),
  ('critical_findings', 'Critical Findings', 'number', 12, 'Findings', NULL),
  ('high_findings', 'High Findings', 'number', 13, 'Findings', NULL),
  ('medium_findings', 'Medium Findings', 'number', 14, 'Findings', NULL),
  ('low_findings', 'Low Findings', 'number', 15, 'Findings', NULL),
  ('remediation_due', 'Remediation Due', 'date', 16, 'Findings', NULL),
  ('retest_date', 'Retest Date', 'date', 17, 'Findings', NULL),
  ('defects', 'Related Defects', 'table', 18, 'Defects', '[{"value":"reference","label":"Ref"},{"value":"summary","label":"Summary"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Fixed","Retest","Closed"]},{"value":"owner","label":"Owner"}]'),
  ('exit_criteria', 'Exit Criteria', 'multi_line', 19, 'Exit & Sign-Off', NULL),
  ('exit_criteria_met', 'Exit Criteria Met', 'boolean', 20, 'Exit & Sign-Off', NULL),
  ('report_reference', 'Report Reference', 'text', 21, 'Exit & Sign-Off', NULL),
  ('signed_off_by', 'Signed Off By', 'user_picker', 22, 'Exit & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 23, 'Exit & Sign-Off', NULL),
  ('risks_issues', 'Risks and Issues', 'table', 24, 'Notes', '[{"value":"item","label":"Risk / Issue"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('notes', 'Notes', 'multi_line', 25, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000001b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"remediation","label":"Remediation"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000001b'::uuid;

-- ── DR Testing ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000001c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('dr_reference', 'Reference', 'text', 0, NULL, NULL),
  ('test_type', 'Test Type', 'dropdown', 1, NULL, '[{"value":"failover","label":"Failover to DR site"},{"value":"failback","label":"Failback"},{"value":"backup_restore","label":"Backup and restore"},{"value":"component","label":"Component switch"}]'),
  ('functional_area', 'Functional Area', 'dropdown', 2, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 3, NULL, '[{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"},{"value":"dr","label":"Disaster recovery site"},{"value":"production","label":"Production"}]'),
  ('lead', 'Lead', 'user_picker', 4, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 5, NULL, NULL),
  ('planned_end', 'Planned End', 'date', 6, NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 7, NULL, NULL),
  ('actual_end', 'Actual End', 'date', 8, NULL, NULL),
  ('runbook_reference', 'DR Runbook Reference', 'text', 9, NULL, NULL),
  ('systems_in_scope', 'Systems and Recovery Objectives', 'table', 10, 'Recovery Objectives', '[{"value":"system","label":"System"},{"value":"rto_target","label":"RTO Target"},{"value":"rto_achieved","label":"RTO Achieved"},{"value":"rpo_target","label":"RPO Target"},{"value":"rpo_achieved","label":"RPO Achieved"},{"value":"result","label":"Result","type":"select","options":["Met","Not met","Not run"]}]'),
  ('data_loss_observed', 'Data Loss Observed', 'boolean', 11, 'Recovery Objectives', NULL),
  ('failback_completed', 'Failback Completed', 'boolean', 12, 'Recovery Objectives', NULL),
  ('steps_log', 'Execution Log', 'table', 13, 'Execution', '[{"value":"time","label":"Time"},{"value":"step","label":"Step"},{"value":"owner","label":"Owner"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Blocked","Not run"]}]'),
  ('defects', 'Defects Raised', 'table', 14, 'Defects', '[{"value":"reference","label":"Ref"},{"value":"summary","label":"Summary"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Fixed","Retest","Closed"]},{"value":"owner","label":"Owner"}]'),
  ('exit_criteria', 'Exit Criteria', 'multi_line', 15, 'Exit & Sign-Off', NULL),
  ('exit_criteria_met', 'Exit Criteria Met', 'boolean', 16, 'Exit & Sign-Off', NULL),
  ('report_reference', 'Report Reference', 'text', 17, 'Exit & Sign-Off', NULL),
  ('signed_off_by', 'Signed Off By', 'user_picker', 18, 'Exit & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 19, 'Exit & Sign-Off', NULL),
  ('risks_issues', 'Risks and Issues', 'table', 20, 'Notes', '[{"value":"item","label":"Risk / Issue"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('notes', 'Notes', 'multi_line', 21, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000001c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"failed","label":"Objectives Not Met"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000001c'::uuid;

-- ── Operational Readiness Testing ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-00000000001d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('ort_reference', 'Reference', 'text', 0, NULL, NULL),
  ('operational_area', 'Operational Area', 'dropdown', 1, NULL, '[{"value":"batch_operations","label":"Batch operations"},{"value":"monitoring","label":"Monitoring and alerting"},{"value":"backup_restore","label":"Backup and restore"},{"value":"service_desk","label":"Service desk"},{"value":"release_management","label":"Release management"},{"value":"access_management","label":"Access management"},{"value":"business_operations","label":"Business operations"}]'),
  ('functional_area', 'Functional Area', 'dropdown', 2, NULL, NULL),
  ('environment', 'Environment', 'dropdown', 3, NULL, '[{"value":"sit","label":"SIT"},{"value":"uat","label":"UAT"},{"value":"pre_production","label":"Pre-production"},{"value":"dr","label":"Disaster recovery site"},{"value":"production","label":"Production"}]'),
  ('lead', 'Lead', 'user_picker', 4, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 5, NULL, NULL),
  ('planned_end', 'Planned End', 'date', 6, NULL, NULL),
  ('actual_start', 'Actual Start', 'date', 7, NULL, NULL),
  ('actual_end', 'Actual End', 'date', 8, NULL, NULL),
  ('support_team', 'Support Team', 'text', 9, NULL, NULL),
  ('scenarios', 'Operational Scenarios', 'table', 10, 'Scenarios', '[{"value":"scenario","label":"Scenario"},{"value":"procedure","label":"Procedure / SOP"},{"value":"team","label":"Team"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Blocked","Not run"]}]'),
  ('sops_verified', 'SOPs Verified', 'number', 11, 'Readiness', NULL),
  ('team_trained', 'Team Trained', 'boolean', 12, 'Readiness', NULL),
  ('monitoring_in_place', 'Monitoring in Place', 'boolean', 13, 'Readiness', NULL),
  ('handover_accepted', 'Handover Accepted by Support', 'boolean', 14, 'Readiness', NULL),
  ('defects', 'Issues Raised', 'table', 15, 'Defects', '[{"value":"reference","label":"Ref"},{"value":"summary","label":"Summary"},{"value":"severity","label":"Severity","type":"select","options":["Critical","High","Medium","Low"]},{"value":"status","label":"Status","type":"select","options":["Open","In progress","Fixed","Retest","Closed"]},{"value":"owner","label":"Owner"}]'),
  ('exit_criteria', 'Exit Criteria', 'multi_line', 16, 'Exit & Sign-Off', NULL),
  ('exit_criteria_met', 'Exit Criteria Met', 'boolean', 17, 'Exit & Sign-Off', NULL),
  ('report_reference', 'Report Reference', 'text', 18, 'Exit & Sign-Off', NULL),
  ('signed_off_by', 'Signed Off By', 'user_picker', 19, 'Exit & Sign-Off', NULL),
  ('sign_off_date', 'Sign-Off Date', 'date', 20, 'Exit & Sign-Off', NULL),
  ('risks_issues', 'Risks and Issues', 'table', 21, 'Notes', '[{"value":"item","label":"Risk / Issue"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('notes', 'Notes', 'multi_line', 22, 'Notes', NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000001d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"},{"key":"not_ready","label":"Not Ready"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000001d'::uuid;

-- Functional Area on all six uses the Data Scope product list.
UPDATE public.local_register_fields f
SET dropdown_options = s.dropdown_options, updated_at = NOW()
FROM public.local_register_fields s
WHERE s.register_id = '00000000-0000-4000-9001-00000000000d'::uuid AND s.field_key = 'product_area'
  AND f.field_key = 'functional_area'
  AND f.register_id IN ('00000000-0000-4000-9001-000000000018'::uuid, '00000000-0000-4000-9001-000000000019'::uuid, '00000000-0000-4000-9001-00000000001a'::uuid, '00000000-0000-4000-9001-00000000001b'::uuid, '00000000-0000-4000-9001-00000000001c'::uuid, '00000000-0000-4000-9001-00000000001d'::uuid);

-- ── Dress Rehearsal Strategy (…9001-…041): tables (rule 67.1) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options)
SELECT '00000000-0000-4000-9001-000000000041'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb
FROM (VALUES
  ('rehearsal_schedule', 'Rehearsal Schedule', 'table', 18, 'Approach', '[{"value":"rehearsal","label":"Rehearsal"},{"value":"date","label":"Date","type":"date"},{"value":"scope","label":"Scope"},{"value":"environment","label":"Environment"},{"value":"status","label":"Status","type":"select","options":["Planned","Done","Repeat"]}]'),
  ('timing_targets', 'Timing Targets', 'table', 21, 'Execution', '[{"value":"activity","label":"Activity"},{"value":"target","label":"Target Duration"},{"value":"measured_by","label":"Measured By"}]'),
  ('participants', 'Participants', 'table', 22, 'Execution', '[{"value":"participant","label":"Participant"},{"value":"organisation","label":"Organisation"},{"value":"role","label":"Role in Rehearsal"}]'),
  ('risks_mitigations', 'Risks and Mitigations', 'table', 28, 'Risks & Roles', '[{"value":"risk","label":"Risk"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', 'table', 29, 'Risks & Roles', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000041'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, updated_at = NOW();

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9001-000000000018', '00000000-0000-4000-9001-000000000019', '00000000-0000-4000-9001-00000000001a', '00000000-0000-4000-9001-00000000001b', '00000000-0000-4000-9001-00000000001c', '00000000-0000-4000-9001-00000000001d', '00000000-0000-4000-9001-000000000041')
GROUP BY r.register_key ORDER BY r.register_key;
