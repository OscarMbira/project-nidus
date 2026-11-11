-- ============================================================================
-- v1415: Production Readiness registers — full forms with tabs (Information Technology)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the seven Production Readiness registers: four had only Title / Description / Status, and the Support Model, Runbooks and Disaster Recovery documents (v1324) get their lists with several parts as tables:
--   Operational Readiness (ict_operational_readiness): 15 fields — Details · Criteria & Evidence · Handover · Issues · Notes
--   Monitoring (ict_monitoring_setup): 17 fields — Details · Thresholds · Alerting · Dashboard · Testing · Notes
--   Logging & Alerting (ict_logging_alerting): 16 fields — Details · Collection & Retention · Alert Rules · Testing · Notes
--   Support Model (ict_support_model): 34 fields — Details · Introduction · Services & Tiers · Service Levels · Processes · Tools & Transition · Risks & Roles · Glossary & Appendices · Document Control
--   Runbooks (ict_runbooks): 25 fields — Details · Overview · Procedure · Verification & Escalation · Maintenance · Risks & Roles · Glossary & Appendices · Document Control
--   Disaster Recovery (ict_disaster_recovery): 37 fields — Details · Introduction · Objectives · DR Strategy · Backup · Procedures · Testing & Contacts · Risks & Roles · Glossary & Appendices · Document Control
--   Go-Live & Hypercare (ict_go_live_hypercare): 22 fields — Details · Go / No-Go · Rollback · Hypercare · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. No calculated fields.
-- Status workflows of the four forms keep their existing keys and gain the states each register needs.
-- The three document registers keep their sign-off workflow (In Review / Approved only by sign-off). No
-- records exist yet for these registers, so no saved values change. All fields optional, vendor-neutral
-- (rule 26). Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1416. Prerequisites: v949, v1321, v1324, v1326. Idempotent.
-- ============================================================================

BEGIN;

-- ── Operational Readiness (ict_operational_readiness) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000020'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('readiness_reference', 'Readiness Reference', 'text', 0, NULL, NULL, NULL),
  ('readiness_area', 'Readiness Area', 'dropdown', 1, NULL, '[{"value":"service_desk","label":"Service desk"},{"value":"monitoring","label":"Monitoring and alerting"},{"value":"runbooks","label":"Runbooks and procedures"},{"value":"support_contracts","label":"Support contracts"},{"value":"backup_recovery","label":"Backup and recovery"},{"value":"capacity","label":"Capacity"},{"value":"security_operations","label":"Security operations"},{"value":"knowledge_transfer","label":"Knowledge transfer"},{"value":"licences","label":"Licences"},{"value":"batch_operations","label":"Batch operations"}]', NULL),
  ('service', 'Service', 'text', 2, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 3, NULL, NULL, NULL),
  ('rag', 'RAG', 'dropdown', 4, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('due_date', 'Due Date', 'date', 5, NULL, NULL, NULL),
  ('completed_date', 'Completed Date', 'date', 6, NULL, NULL, NULL),
  ('acceptance_criteria', 'Acceptance Criteria', 'table', 7, 'Criteria & Evidence', '[{"value":"criterion","label":"Criterion"},{"value":"met","label":"Met","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('evidence', 'Evidence', 'table', 8, 'Criteria & Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('receiving_team', 'Receiving Team', 'text', 9, 'Handover', NULL, NULL),
  ('handover_date', 'Handover Date', 'date', 10, 'Handover', NULL, NULL),
  ('accepted_by', 'Accepted By', 'text', 11, 'Handover', NULL, NULL),
  ('acceptance_date', 'Acceptance Date', 'date', 12, 'Handover', NULL, NULL),
  ('issues', 'Issues', 'table', 13, 'Issues', '[{"value":"issue","label":"Issue"},{"value":"severity","label":"Severity","type":"select","options":["High","Medium","Low"]},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"}]', NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000020'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_ready","label":"Not Ready"},{"key":"in_progress","label":"In Progress"},{"key":"at_risk","label":"At Risk"},{"key":"ready","label":"Ready"},{"key":"accepted","label":"Accepted by Operations"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000020'::uuid;

-- ── Monitoring (ict_monitoring_setup) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000021'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('monitor_reference', 'Monitor Reference', 'text', 0, NULL, NULL, NULL),
  ('service', 'Service', 'text', 1, NULL, NULL, NULL),
  ('monitor_type', 'Monitor Type', 'dropdown', 2, NULL, '[{"value":"availability","label":"Availability"},{"value":"performance","label":"Performance / response time"},{"value":"capacity","label":"Capacity"},{"value":"batch","label":"Batch jobs"},{"value":"interface","label":"Interface"},{"value":"synthetic","label":"Synthetic customer journey"},{"value":"business","label":"Business measure"}]', NULL),
  ('tool', 'Monitoring Tool', 'text', 3, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 4, NULL, NULL, NULL),
  ('environment', 'Environment', 'text', 5, NULL, NULL, NULL),
  ('metrics', 'Metrics and Thresholds', 'table', 6, 'Thresholds', '[{"value":"metric","label":"Metric"},{"value":"warning","label":"Warning"},{"value":"critical","label":"Critical"},{"value":"unit","label":"Unit"}]', NULL),
  ('check_interval_minutes', 'Check Every (minutes)', 'number', 7, 'Thresholds', NULL, NULL),
  ('alert_team', 'Alert Goes To', 'text', 8, 'Alerting', NULL, NULL),
  ('notify_by', 'Notify By', 'multi_select', 9, 'Alerting', '[{"value":"ticket","label":"Ticket"},{"value":"email","label":"Email"},{"value":"sms","label":"SMS"},{"value":"phone","label":"Phone call"},{"value":"chat","label":"Team chat channel"}]', NULL),
  ('out_of_hours', 'Alerts Out of Hours', 'boolean', 10, 'Alerting', NULL, NULL),
  ('runbook_reference', 'Runbook', 'text', 11, 'Alerting', NULL, NULL),
  ('dashboard', 'Dashboard', 'text', 12, 'Dashboard', NULL, NULL),
  ('audience', 'Dashboard Audience', 'multi_line', 13, 'Dashboard', NULL, NULL),
  ('tested_date', 'Tested On', 'date', 14, 'Testing', NULL, NULL),
  ('test_result', 'Test Result', 'dropdown', 15, 'Testing', '[{"value":"not_tested","label":"Not tested"},{"value":"passed","label":"Passed"},{"value":"failed","label":"Failed"}]', NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000021'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"tested","label":"Tested"},{"key":"ready","label":"Ready"},{"key":"live","label":"Live"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000021'::uuid;

-- ── Logging & Alerting (ict_logging_alerting) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000022'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('log_source_reference', 'Log Source Reference', 'text', 0, NULL, NULL, NULL),
  ('system', 'System', 'text', 1, NULL, NULL, NULL),
  ('log_type', 'Log Type', 'dropdown', 2, NULL, '[{"value":"application","label":"Application"},{"value":"audit","label":"Audit"},{"value":"security","label":"Security"},{"value":"access","label":"Access"},{"value":"transaction","label":"Transaction"},{"value":"interface","label":"Interface"},{"value":"infrastructure","label":"Infrastructure"}]', NULL),
  ('owner', 'Owner', 'text', 3, NULL, NULL, NULL),
  ('environment', 'Environment', 'text', 4, NULL, NULL, NULL),
  ('collection_method', 'Collection Method', 'dropdown', 5, 'Collection & Retention', '[{"value":"agent","label":"Agent on the server"},{"value":"forwarding","label":"Log forwarding"},{"value":"api","label":"API pull"},{"value":"file","label":"File pickup"}]', NULL),
  ('destination', 'Sent To', 'text', 6, 'Collection & Retention', NULL, NULL),
  ('daily_volume_gb', 'Daily Volume (GB)', 'number', 7, 'Collection & Retention', NULL, NULL),
  ('retention_days', 'Kept For (days)', 'number', 8, 'Collection & Retention', NULL, NULL),
  ('retention_reason', 'Retention Reason', 'text', 9, 'Collection & Retention', NULL, NULL),
  ('personal_data', 'Contains Personal Data', 'boolean', 10, 'Collection & Retention', NULL, NULL),
  ('masking_applied', 'Masking Applied', 'boolean', 11, 'Collection & Retention', NULL, NULL),
  ('alert_rules', 'Alert Rules', 'table', 12, 'Alert Rules', '[{"value":"rule","label":"Rule"},{"value":"priority","label":"Priority","type":"select","options":["P1","P2","P3","P4"]},{"value":"route","label":"Route To"}]', NULL),
  ('tested_date', 'Tested On', 'date', 13, 'Testing', NULL, NULL),
  ('test_result', 'Test Result', 'dropdown', 14, 'Testing', '[{"value":"not_tested","label":"Not tested"},{"value":"passed","label":"Passed"},{"value":"failed","label":"Failed"}]', NULL),
  ('notes', 'Notes', 'long_text', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000022'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"tested","label":"Tested"},{"key":"ready","label":"Ready"},{"key":"live","label":"Live"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000022'::uuid;

-- ── Support Model (ict_support_model) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('tier_structure', 'Tier Structure', '[{"value":"tier","label":"Tier"},{"value":"team","label":"Team"},{"value":"handles","label":"Handles"}]'),
  ('support_teams', 'Support Teams', '[{"value":"team","label":"Team"},{"value":"hours","label":"Hours"},{"value":"contact","label":"Contact"}]'),
  ('supplier_support', 'Supplier Support', '[{"value":"supplier","label":"Supplier"},{"value":"service","label":"Service"},{"value":"cover","label":"Cover"}]'),
  ('priority_definitions', 'Priority Definitions', '[{"value":"priority","label":"Priority"},{"value":"definition","label":"Definition"},{"value":"example","label":"Example"}]'),
  ('service_levels', 'Service Levels', '[{"value":"priority","label":"Priority"},{"value":"response","label":"Response"},{"value":"resolution","label":"Resolution"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9003-000000000023'::uuid AND f.field_key = v.field_key;

-- ── Runbooks (ict_runbooks) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('steps', 'Steps', '[{"value":"seq","label":"Seq"},{"value":"step","label":"Step"},{"value":"expected","label":"Expected Result"}]'),
  ('escalation_contacts', 'Escalation Contacts', '[{"value":"level","label":"Level"},{"value":"contact","label":"Contact"},{"value":"when","label":"When"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9003-000000000024'::uuid AND f.field_key = v.field_key;

-- ── Disaster Recovery (ict_disaster_recovery) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('backup_schedule', 'Backup Schedule', '[{"value":"data","label":"Data / System"},{"value":"type","label":"Backup Type"},{"value":"frequency","label":"Frequency"}]'),
  ('backup_retention', 'Backup Retention', '[{"value":"backup","label":"Backup"},{"value":"retention","label":"Kept For"}]'),
  ('dr_team', 'DR Team', '[{"value":"role","label":"Role"},{"value":"name","label":"Name"},{"value":"contact","label":"Contact"}]'),
  ('supplier_contacts', 'Supplier Contacts', '[{"value":"supplier","label":"Supplier"},{"value":"service","label":"Service"},{"value":"contact","label":"Contact"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9003-000000000025'::uuid AND f.field_key = v.field_key;

-- ── Go-Live & Hypercare (ict_go_live_hypercare) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9003-000000000026'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('release_reference', 'Release Reference', 'text', 0, NULL, NULL, NULL),
  ('systems', 'Systems Going Live', 'multi_line', 1, NULL, NULL, NULL),
  ('go_live_date', 'Go-Live Date', 'date', 2, NULL, NULL, NULL),
  ('go_live_window', 'Go-Live Window', 'text', 3, NULL, NULL, NULL),
  ('release_manager', 'Release Manager', 'text', 4, NULL, NULL, NULL),
  ('decision_owner', 'Decision Owner', 'text', 5, NULL, NULL, NULL),
  ('go_criteria', 'Go / No-Go Criteria', 'table', 6, 'Go / No-Go', '[{"value":"criterion","label":"Criterion"},{"value":"status","label":"Status","type":"select","options":["Met","Not met","Waived","Not yet assessed"]}]', NULL),
  ('decision', 'Decision', 'dropdown', 7, 'Go / No-Go', '[{"value":"pending","label":"Pending"},{"value":"go","label":"Go"},{"value":"go_conditions","label":"Go with conditions"},{"value":"no_go","label":"No-go"}]', NULL),
  ('decision_date', 'Decision Date', 'date', 8, 'Go / No-Go', NULL, NULL),
  ('conditions', 'Conditions', 'multi_line', 9, 'Go / No-Go', NULL, NULL),
  ('rollback_point', 'Point of No Return', 'text', 10, 'Rollback', NULL, NULL),
  ('rollback_plan_reference', 'Rollback Plan', 'text', 11, 'Rollback', NULL, NULL),
  ('rollback_used', 'Rollback Used', 'boolean', 12, 'Rollback', NULL, NULL),
  ('hypercare_start', 'Hypercare Start', 'date', 13, 'Hypercare', NULL, NULL),
  ('hypercare_end', 'Hypercare End', 'date', 14, 'Hypercare', NULL, NULL),
  ('p1_incidents', 'P1 Incidents', 'number', 15, 'Hypercare', NULL, NULL),
  ('p2_incidents', 'P2 Incidents', 'number', 16, 'Hypercare', NULL, NULL),
  ('total_incidents', 'All Incidents', 'number', 17, 'Hypercare', NULL, NULL),
  ('exit_criteria', 'Hypercare Exit Criteria', 'table', 18, 'Hypercare', '[{"value":"criterion","label":"Criterion"},{"value":"met","label":"Met","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('handed_to', 'Handed Over To', 'text', 19, 'Hypercare', NULL, NULL),
  ('stabilised_date', 'Stabilised On', 'date', 20, 'Hypercare', NULL, NULL),
  ('notes', 'Notes', 'long_text', 21, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9003-000000000026'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"no_go","label":"No-Go / Deferred"},{"key":"go_live","label":"Go-Live"},{"key":"hypercare","label":"Hypercare"},{"key":"stabilised","label":"Stabilised"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9003-000000000026'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9003-000000000020'::uuid, '00000000-0000-4000-9003-000000000021'::uuid, '00000000-0000-4000-9003-000000000022'::uuid, '00000000-0000-4000-9003-000000000023'::uuid, '00000000-0000-4000-9003-000000000024'::uuid, '00000000-0000-4000-9003-000000000025'::uuid, '00000000-0000-4000-9003-000000000026'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
