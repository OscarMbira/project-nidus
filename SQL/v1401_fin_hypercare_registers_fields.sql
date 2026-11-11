-- ============================================================================
-- v1401: Hypercare registers — full forms with tabs (Banking & Financial Services)
-- ============================================================================
-- Owner request 2026-11-09: best-practice fields, in logical tabs, for the seven Hypercare registers: six had only Title / Description / Status, and the Hypercare Plan document (v1322) gets its lists with several parts as tables:
--   Hypercare Plan (fin_hypercare_plan): 35 fields — Details · Introduction · Support Model · Monitoring & KPIs · Incidents & Defects · Exit & Handover · Risks & Roles · Glossary & Appendices · Document Control
--   Daily Command Centre (fin_daily_command_centre): 18 fields — Details · Service Status · Issues · Decisions & Actions · Communication · Notes
--   Incidents (fin_hypercare_incidents): 22 fields — Details · Impact · Resolution · Timeline · Notes
--   Defects (fin_hypercare_defects): 19 fields — Details · Analysis · Fix & Retest · Notes
--   Performance Monitoring (fin_hypercare_performance_monitoring): 16 fields — Details · Thresholds · Latest Reading · Readings · Actions · Notes
--   User Support (fin_user_support): 18 fields — Details · Resolution · Follow-Up · Notes
--   Exit Criteria (fin_exit_criteria): 13 fields — Details · Measurement · Evidence · Acceptance · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Time to respond and resolve, and variance against the legacy baseline, are calculated fields (v1375), worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. No records exist
-- yet for these registers, so no saved values change. All fields optional, vendor-neutral (rule 26).
-- Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1402. Prerequisites: v947, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── Hypercare Plan (fin_hypercare_plan) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('support_tiers', 'Support Tiers', '[{"value":"tier","label":"Tier"},{"value":"team","label":"Team"},{"value":"handles","label":"Handles"}]'),
  ('on_call_rota', 'On-Call Rota', '[{"value":"period","label":"Period"},{"value":"role","label":"Role"},{"value":"name","label":"Name"},{"value":"contact","label":"Contact"}]'),
  ('kpis', 'KPIs', '[{"value":"kpi","label":"KPI"},{"value":"target","label":"Target"},{"value":"measured_by","label":"Measured By"}]'),
  ('daily_checks', 'Daily Checks', '[{"value":"check","label":"Check"},{"value":"time","label":"Time"},{"value":"owner","label":"Owner"}]'),
  ('severity_definitions', 'Severity Definitions', '[{"value":"severity","label":"Severity"},{"value":"definition","label":"Definition"},{"value":"example","label":"Example"}]'),
  ('response_and_resolution_targets', 'Response & Resolution Targets', '[{"value":"severity","label":"Severity"},{"value":"response","label":"Response"},{"value":"resolution","label":"Resolution"},{"value":"updates","label":"Update Frequency"}]'),
  ('escalation_path', 'Escalation Path', '[{"value":"level","label":"Level"},{"value":"escalate_to","label":"Escalate To"},{"value":"when","label":"When"}]'),
  ('exit_criteria', 'Exit Criteria', '[{"value":"criterion","label":"Criterion"},{"value":"target","label":"Target"},{"value":"evidence","label":"Evidence"}]'),
  ('knowledge_transfer', 'Knowledge Transfer', '[{"value":"topic","label":"Topic"},{"value":"from","label":"From"},{"value":"to","label":"To"},{"value":"date","label":"Date","type":"date"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"impact","label":"Impact"},{"value":"mitigation","label":"Mitigation"},{"value":"owner","label":"Owner"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]'),
  ('related_documents', 'Related Documents', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9001-000000000038'::uuid AND f.field_key = v.field_key;

-- ── Daily Command Centre (fin_daily_command_centre) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-000000000039'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('log_reference', 'Log Reference', 'text', 0, NULL, NULL, NULL),
  ('log_date', 'Date', 'date', 1, NULL, NULL, NULL),
  ('hypercare_day', 'Hypercare Day', 'number', 2, NULL, NULL, NULL),
  ('chair', 'Chair', 'user_picker', 3, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 4, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('service_status', 'Service Status', 'table', 5, 'Service Status', '[{"value":"service","label":"Service"},{"value":"status","label":"Status","type":"select","options":["Green","Amber","Red"]},{"value":"comment","label":"Comment"}]', NULL),
  ('kpi_snapshot', 'KPI Snapshot', 'table', 6, 'Service Status', '[{"value":"kpi","label":"KPI"},{"value":"target","label":"Target"},{"value":"actual","label":"Actual"},{"value":"rag","label":"RAG","type":"select","options":["Green","Amber","Red"]}]', NULL),
  ('new_incidents', 'New Incidents', 'number', 7, 'Issues', NULL, NULL),
  ('open_incidents', 'Open Incidents', 'number', 8, 'Issues', NULL, NULL),
  ('new_defects', 'New Defects', 'number', 9, 'Issues', NULL, NULL),
  ('open_defects', 'Open Defects', 'number', 10, 'Issues', NULL, NULL),
  ('support_requests', 'Support Requests Received', 'number', 11, 'Issues', NULL, NULL),
  ('top_issues', 'Top Issues', 'table', 12, 'Issues', '[{"value":"issue","label":"Issue"},{"value":"owner","label":"Owner"},{"value":"action","label":"Action"}]', NULL),
  ('decisions', 'Decisions', 'multi_line', 13, 'Decisions & Actions', NULL, NULL),
  ('actions', 'Actions', 'table', 14, 'Decisions & Actions', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","Done"]}]', NULL),
  ('summary', 'Daily Summary', 'long_text', 15, 'Communication', NULL, NULL),
  ('summary_sent_to', 'Summary Sent To', 'multi_line', 16, 'Communication', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-000000000039'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-000000000039'::uuid;

-- ── Incidents (fin_hypercare_incidents) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000003a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('incident_reference', 'Incident Reference', 'text', 0, NULL, NULL, NULL),
  ('priority', 'Priority', 'dropdown', 1, NULL, '[{"value":"p1","label":"P1 – critical"},{"value":"p2","label":"P2 – high"},{"value":"p3","label":"P3 – medium"},{"value":"p4","label":"P4 – low"}]', NULL),
  ('category', 'Category', 'dropdown', 2, NULL, '[{"value":"availability","label":"Availability"},{"value":"performance","label":"Performance"},{"value":"functional","label":"Functional"},{"value":"data","label":"Data"},{"value":"interface","label":"Interface"},{"value":"access","label":"Access"},{"value":"batch","label":"Batch / end of day"}]', NULL),
  ('affected_service', 'Affected Service', 'dropdown', 3, NULL, '[{"value":"branches","label":"Branches"},{"value":"payments","label":"Payments"},{"value":"cards_atms","label":"Cards and ATMs"},{"value":"digital_channels","label":"Digital channels"},{"value":"contact_centre","label":"Contact centre"},{"value":"back_office","label":"Back office"},{"value":"reporting","label":"Reporting"}]', NULL),
  ('business_unit', 'Business Unit', 'dropdown', 4, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"}]', NULL),
  ('reported_at', 'Reported At', 'datetime', 5, NULL, NULL, NULL),
  ('reported_by', 'Reported By', 'text', 6, NULL, NULL, NULL),
  ('assigned_team', 'Assigned Team', 'text', 7, NULL, NULL, NULL),
  ('assignee', 'Assignee', 'user_picker', 8, NULL, NULL, NULL),
  ('customers_affected', 'Customers Affected', 'number', 9, 'Impact', NULL, NULL),
  ('branches_affected', 'Branches Affected', 'number', 10, 'Impact', NULL, NULL),
  ('impact_description', 'Impact', 'long_text', 11, 'Impact', NULL, NULL),
  ('workaround', 'Workaround', 'long_text', 12, 'Impact', NULL, NULL),
  ('responded_at', 'Responded At', 'datetime', 13, 'Resolution', NULL, NULL),
  ('resolved_at', 'Resolved At', 'datetime', 14, 'Resolution', NULL, NULL),
  ('time_to_respond', 'Time to Respond', 'number', 15, 'Resolution', NULL, '{"op":"minutes_between","start":"reported_at","end":"responded_at","display":"duration"}'),
  ('time_to_resolve', 'Time to Resolve', 'number', 16, 'Resolution', NULL, '{"op":"minutes_between","start":"reported_at","end":"resolved_at","display":"duration"}'),
  ('root_cause', 'Root Cause', 'long_text', 17, 'Resolution', NULL, NULL),
  ('resolution', 'Resolution', 'long_text', 18, 'Resolution', NULL, NULL),
  ('linked_defect', 'Linked Defect', 'text', 19, 'Resolution', NULL, NULL),
  ('timeline', 'Timeline', 'table', 20, 'Timeline', '[{"value":"time","label":"Time"},{"value":"update","label":"Update"},{"value":"by","label":"By"}]', NULL),
  ('notes', 'Notes', 'multi_line', 21, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000003a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"resolved","label":"Resolved"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000003a'::uuid;

-- ── Defects (fin_hypercare_defects) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000003b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('defect_reference', 'Defect Reference', 'text', 0, NULL, NULL, NULL),
  ('severity', 'Severity', 'dropdown', 1, NULL, '[{"value":"critical","label":"Critical"},{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('defect_type', 'Defect Type', 'dropdown', 2, NULL, '[{"value":"data_migration","label":"Data migration"},{"value":"configuration","label":"Configuration"},{"value":"code","label":"Code"},{"value":"interface","label":"Interface"},{"value":"report","label":"Report"},{"value":"documentation","label":"Documentation / procedure"}]', NULL),
  ('component', 'Component', 'dropdown', 3, NULL, '[{"value":"core_banking","label":"Core banking platform"},{"value":"integration","label":"Integration layer"},{"value":"channels","label":"Channels"},{"value":"payments","label":"Payments"},{"value":"infrastructure","label":"Infrastructure"},{"value":"database","label":"Database"},{"value":"batch","label":"Batch and scheduling"},{"value":"reporting","label":"Reporting"},{"value":"data","label":"Migrated data"}]', NULL),
  ('found_date', 'Found Date', 'date', 4, NULL, NULL, NULL),
  ('raised_by', 'Raised By', 'text', 5, NULL, NULL, NULL),
  ('owner', 'Owner', 'user_picker', 6, NULL, NULL, NULL),
  ('linked_incident', 'Linked Incident', 'text', 7, NULL, NULL, NULL),
  ('steps_to_reproduce', 'Steps to Reproduce', 'multi_line', 8, 'Analysis', NULL, NULL),
  ('root_cause', 'Root Cause', 'long_text', 9, 'Analysis', NULL, NULL),
  ('records_affected', 'Records Affected', 'number', 10, 'Analysis', NULL, NULL),
  ('data_fix_required', 'Data Fix Required', 'boolean', 11, 'Analysis', NULL, NULL),
  ('fix_description', 'Fix', 'long_text', 12, 'Fix & Retest', NULL, NULL),
  ('fix_release', 'Fix Release', 'text', 13, 'Fix & Retest', NULL, NULL),
  ('target_date', 'Target Date', 'date', 14, 'Fix & Retest', NULL, NULL),
  ('fixed_date', 'Fixed Date', 'date', 15, 'Fix & Retest', NULL, NULL),
  ('retest_result', 'Retest Result', 'dropdown', 16, 'Fix & Retest', '[{"value":"pass","label":"Pass"},{"value":"fail","label":"Fail"},{"value":"not_run","label":"Not run"}]', NULL),
  ('deployed_to_production', 'Deployed to Production', 'boolean', 17, 'Fix & Retest', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 18, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000003b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"resolved","label":"Resolved"},{"key":"deferred","label":"Deferred"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000003b'::uuid;

-- ── Performance Monitoring (fin_hypercare_performance_monitoring) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000003c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('metric_reference', 'Metric Reference', 'text', 0, NULL, NULL, NULL),
  ('metric', 'Metric', 'text', 1, NULL, NULL, NULL),
  ('component', 'Component', 'dropdown', 2, NULL, '[{"value":"core_banking","label":"Core banking platform"},{"value":"integration","label":"Integration layer"},{"value":"channels","label":"Channels"},{"value":"payments","label":"Payments"},{"value":"infrastructure","label":"Infrastructure"},{"value":"database","label":"Database"},{"value":"batch","label":"Batch and scheduling"},{"value":"reporting","label":"Reporting"},{"value":"data","label":"Migrated data"}]', NULL),
  ('unit', 'Unit', 'text', 3, NULL, NULL, NULL),
  ('owner', 'Owner', 'user_picker', 4, NULL, NULL, NULL),
  ('target', 'Target', 'text', 5, 'Thresholds', NULL, NULL),
  ('warning_threshold', 'Warning Threshold', 'text', 6, 'Thresholds', NULL, NULL),
  ('critical_threshold', 'Critical Threshold', 'text', 7, 'Thresholds', NULL, NULL),
  ('baseline_value', 'Legacy Baseline', 'number', 8, 'Latest Reading', NULL, NULL),
  ('latest_value', 'Latest Value', 'number', 9, 'Latest Reading', NULL, NULL),
  ('variance', 'Variance against Baseline', 'number', 10, 'Latest Reading', NULL, '{"op":"difference","minuend":"latest_value","subtrahend":"baseline_value"}'),
  ('latest_reading_at', 'Latest Reading At', 'datetime', 11, 'Latest Reading', NULL, NULL),
  ('readings', 'Readings', 'table', 12, 'Readings', '[{"value":"date","label":"Date","type":"date"},{"value":"period","label":"Period"},{"value":"value","label":"Value"},{"value":"status","label":"Status","type":"select","options":["Nominal","Degraded","Critical"]}]', NULL),
  ('actions_taken', 'Actions Taken', 'multi_line', 13, 'Actions', NULL, NULL),
  ('linked_incident', 'Linked Incident', 'text', 14, 'Actions', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000003c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"nominal","label":"Nominal"},{"key":"degraded","label":"Degraded"},{"key":"critical","label":"Critical"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000003c'::uuid;

-- ── User Support (fin_user_support) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000003d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('ticket_reference', 'Ticket Reference', 'text', 0, NULL, NULL, NULL),
  ('request_type', 'Request Type', 'dropdown', 1, NULL, '[{"value":"how_to","label":"How-to question"},{"value":"access","label":"Access / password"},{"value":"error","label":"Error message"},{"value":"data_query","label":"Data query"},{"value":"training_need","label":"Training need"},{"value":"change_request","label":"Change request"}]', NULL),
  ('business_unit', 'Business Unit', 'dropdown', 2, NULL, '[{"value":"retail_branches","label":"Retail branches"},{"value":"contact_centre","label":"Contact centre"},{"value":"business_banking","label":"Business banking"},{"value":"corporate_trade","label":"Corporate and trade finance"},{"value":"treasury","label":"Treasury"},{"value":"payments_operations","label":"Payments operations"},{"value":"card_operations","label":"Card operations"},{"value":"finance","label":"Finance"},{"value":"risk_compliance","label":"Risk and compliance"},{"value":"digital_channels","label":"Digital channels"},{"value":"it_operations","label":"IT operations"}]', NULL),
  ('location', 'Branch / Location', 'text', 3, NULL, NULL, NULL),
  ('raised_by', 'Raised By', 'text', 4, NULL, NULL, NULL),
  ('raised_at', 'Raised At', 'datetime', 5, NULL, NULL, NULL),
  ('channel', 'Channel', 'dropdown', 6, NULL, '[{"value":"phone","label":"Service desk phone"},{"value":"portal","label":"Self-service portal"},{"value":"super_user","label":"Super user"},{"value":"email","label":"Email"},{"value":"walk_in","label":"Walk-in / floor walker"}]', NULL),
  ('priority', 'Priority', 'dropdown', 7, NULL, '[{"value":"p1","label":"P1 – critical"},{"value":"p2","label":"P2 – high"},{"value":"p3","label":"P3 – medium"},{"value":"p4","label":"P4 – low"}]', NULL),
  ('assigned_to', 'Assigned To', 'user_picker', 8, NULL, NULL, NULL),
  ('resolved_at', 'Resolved At', 'datetime', 9, 'Resolution', NULL, NULL),
  ('time_to_resolve', 'Time to Resolve', 'number', 10, 'Resolution', NULL, '{"op":"minutes_between","start":"raised_at","end":"resolved_at","display":"duration"}'),
  ('resolved_by_tier', 'Resolved By', 'dropdown', 11, 'Resolution', '[{"value":"super_user","label":"Super user"},{"value":"service_desk","label":"Service desk"},{"value":"application_support","label":"Application support"},{"value":"vendor","label":"Vendor"}]', NULL),
  ('resolution', 'Resolution', 'long_text', 12, 'Resolution', NULL, NULL),
  ('knowledge_article', 'Knowledge Article', 'text', 13, 'Resolution', NULL, NULL),
  ('satisfaction', 'Satisfaction (1–5)', 'number', 14, 'Resolution', NULL, NULL),
  ('training_gap', 'Training Gap Found', 'boolean', 15, 'Follow-Up', NULL, NULL),
  ('follow_up', 'Follow-Up', 'multi_line', 16, 'Follow-Up', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000003d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"resolved","label":"Resolved"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000003d'::uuid;

-- ── Exit Criteria (fin_exit_criteria) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9001-00000000003e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('criterion_reference', 'Criterion Reference', 'text', 0, NULL, NULL, NULL),
  ('category', 'Category', 'dropdown', 1, NULL, '[{"value":"stability","label":"System stability"},{"value":"incidents","label":"Incidents"},{"value":"defects","label":"Defects"},{"value":"performance","label":"Performance"},{"value":"business_operations","label":"Business operations"},{"value":"support_handover","label":"Support handover"},{"value":"reporting","label":"Reporting and finance"}]', NULL),
  ('owner', 'Owner', 'user_picker', 2, NULL, NULL, NULL),
  ('measure', 'Measure', 'text', 3, 'Measurement', NULL, NULL),
  ('target', 'Target', 'text', 4, 'Measurement', NULL, NULL),
  ('actual', 'Actual', 'text', 5, 'Measurement', NULL, NULL),
  ('measured_on', 'Measured On', 'date', 6, 'Measurement', NULL, NULL),
  ('trend', 'Trend', 'dropdown', 7, 'Measurement', '[{"value":"improving","label":"Improving"},{"value":"stable","label":"Stable"},{"value":"worsening","label":"Worsening"}]', NULL),
  ('evidence', 'Evidence', 'table', 8, 'Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('accepted_by', 'Accepted By', 'user_picker', 9, 'Acceptance', NULL, NULL),
  ('accepted_date', 'Accepted Date', 'date', 10, 'Acceptance', NULL, NULL),
  ('conditions', 'Conditions', 'multi_line', 11, 'Acceptance', NULL, NULL),
  ('notes', 'Notes', 'multi_line', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9001-00000000003e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_met","label":"Not Met"},{"key":"met_with_conditions","label":"Met with Conditions"},{"key":"met","label":"Met"},{"key":"waived","label":"Waived"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9001-00000000003e'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9001-000000000038'::uuid, '00000000-0000-4000-9001-000000000039'::uuid, '00000000-0000-4000-9001-00000000003a'::uuid, '00000000-0000-4000-9001-00000000003b'::uuid, '00000000-0000-4000-9001-00000000003c'::uuid, '00000000-0000-4000-9001-00000000003d'::uuid, '00000000-0000-4000-9001-00000000003e'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
