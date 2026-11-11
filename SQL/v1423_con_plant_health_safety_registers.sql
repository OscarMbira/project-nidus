-- ============================================================================
-- v1423: Plant, Equipment, Health & Safety registers — full forms with tabs (Construction & Engineering)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the ten Construction & Engineering registers under Plant & Equipment and Health & Safety: eight had only Title / Description / Status, and the HSE Plan and Method Statement documents (v1323) get their lists with several parts as tables:
--   Equipment Register (con_equipment_register): 18 fields — Details · Hire · Compliance · Utilisation · Notes
--   Equipment Maintenance (con_equipment_maintenance): 14 fields — Details · Work Done · Cost & Next · Notes
--   HSE Plan (con_hse_plan): 45 fields — Details · Introduction · Policy & Objectives · Hazards & Controls · Safe Systems of Work · Training & Competence · Emergency Preparedness · Environment · Monitoring & Reporting · Risks & Roles · Glossary & Appendices · Document Control
--   Risk Assessments (con_risk_assessments): 15 fields — Details · Hazards & Controls · Approval & Briefing · Notes
--   Method Statements (con_method_statements): 29 fields — Details · Scope of Work · Resources · Hazards & Controls · Quality & Emergency · Briefing · Risks & Roles · Glossary & Appendices · Document Control
--   Toolbox Talks (con_toolbox_talks): 14 fields — Details · Content · Attendance · Notes
--   Safety Inspections (con_safety_inspections): 11 fields — Details · Score · Findings · Notes
--   Incidents (con_hse_incidents): 20 fields — Details · Details · Reporting · Investigation · Notes
--   Near Misses (con_near_misses): 15 fields — Details · Details · Review · Notes
--   Corrective Actions (con_hse_corrective_actions): 14 fields — Details · Action · Verification · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Plant utilisation and safety inspection compliance are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. Document registers keep
-- their sign-off workflow (In Review / Approved only by sign-off).
-- No records exist yet for these registers, so no saved values change. All fields optional, vendor-neutral
-- (rule 26). Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1424. Prerequisites: v948, v1321, v1323, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── Equipment Register (con_equipment_register) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000024'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('plant_id', 'Plant ID', 'text', 0, NULL, NULL, NULL),
  ('equipment_type', 'Equipment Type', 'dropdown', 1, NULL, '[{"value":"mobile_crane","label":"Mobile crane"},{"value":"telehandler","label":"Telehandler"},{"value":"excavator","label":"Excavator"},{"value":"dumper","label":"Dumper"},{"value":"roller","label":"Roller"},{"value":"concrete_pump","label":"Concrete pump"},{"value":"mewp","label":"Mobile elevating work platform"},{"value":"forklift","label":"Forklift"},{"value":"generator","label":"Generator"},{"value":"laser_screed","label":"Laser screed"}]', NULL),
  ('description_size', 'Size / Capacity', 'text', 2, NULL, NULL, NULL),
  ('supplier', 'Owner / Hire Company', 'text', 3, NULL, NULL, NULL),
  ('hired_or_owned', 'Hired or Owned', 'dropdown', 4, NULL, '[{"value":"hired","label":"Hired"},{"value":"owned","label":"Owned"}]', NULL),
  ('operator', 'Operator', 'text', 5, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 6, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('on_hire_date', 'On Hire', 'date', 7, 'Hire', NULL, NULL),
  ('off_hire_planned', 'Planned Off Hire', 'date', 8, 'Hire', NULL, NULL),
  ('weekly_rate', 'Weekly Rate', 'currency', 9, 'Hire', NULL, NULL),
  ('thorough_exam_due', 'Thorough Examination Due', 'date', 10, 'Compliance', NULL, NULL),
  ('last_service', 'Last Service', 'date', 11, 'Compliance', NULL, NULL),
  ('certificate_reference', 'Certificate Reference', 'text', 12, 'Compliance', NULL, NULL),
  ('operator_card_checked', 'Operator Card Checked', 'boolean', 13, 'Compliance', NULL, NULL),
  ('hours_available', 'Hours Available This Month', 'number', 14, 'Utilisation', NULL, NULL),
  ('hours_used', 'Hours Used This Month', 'number', 15, 'Utilisation', NULL, NULL),
  ('utilisation', 'Utilisation (%)', 'number', 16, 'Utilisation', NULL, '{"op":"percent","numerator":"hours_used","denominator":"hours_available","display":"percent"}'),
  ('notes', 'Notes', 'long_text', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000024'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"mobilised","label":"Mobilised"},{"key":"allocated","label":"Allocated"},{"key":"available","label":"Available"},{"key":"under_repair","label":"Under Repair"},{"key":"demobilised","label":"Demobilised"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000024'::uuid;

-- ── Equipment Maintenance (con_equipment_maintenance) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000025'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('maintenance_reference', 'Maintenance Reference', 'text', 0, NULL, NULL, NULL),
  ('plant_id', 'Plant ID', 'text', 1, NULL, NULL, NULL),
  ('equipment', 'Equipment', 'text', 2, NULL, NULL, NULL),
  ('maintenance_type', 'Type', 'dropdown', 3, NULL, '[{"value":"daily_check","label":"Daily check"},{"value":"service","label":"Planned service"},{"value":"thorough_exam","label":"Thorough examination"},{"value":"repair","label":"Repair"},{"value":"breakdown","label":"Breakdown"}]', NULL),
  ('scheduled_date', 'Scheduled', 'date', 4, NULL, NULL, NULL),
  ('completed_date', 'Completed', 'date', 5, NULL, NULL, NULL),
  ('done_by', 'Done By', 'text', 6, NULL, NULL, NULL),
  ('hour_meter', 'Hour Meter Reading', 'number', 7, NULL, NULL, NULL),
  ('checks', 'Checks', 'table', 8, 'Work Done', '[{"value":"check","label":"Check"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","N/A"]}]', NULL),
  ('parts_replaced', 'Parts Replaced', 'multi_line', 9, 'Work Done', NULL, NULL),
  ('downtime_hours', 'Downtime (hours)', 'number', 10, 'Cost & Next', NULL, NULL),
  ('cost', 'Cost', 'currency', 11, 'Cost & Next', NULL, NULL),
  ('next_due', 'Next Due', 'date', 12, 'Cost & Next', NULL, NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000025'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"scheduled","label":"Scheduled"},{"key":"overdue","label":"Overdue"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000025'::uuid;

-- ── HSE Plan (con_hse_plan) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('training_matrix', 'Training Matrix', '[{"value":"role","label":"Role"},{"value":"training","label":"Training"},{"value":"refresh","label":"Refresh"}]'),
  ('emergency_contacts', 'Emergency Contacts', '[{"value":"service","label":"Service"},{"value":"contact","label":"Contact"}]'),
  ('inspections_and_audits', 'Inspections and Audits', '[{"value":"inspection","label":"Inspection"},{"value":"frequency","label":"Frequency"},{"value":"by","label":"By"}]'),
  ('hse_kpis', 'HSE KPIs', '[{"value":"kpi","label":"KPI"},{"value":"target","label":"Target"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9002-000000000026'::uuid AND f.field_key = v.field_key;

-- ── Risk Assessments (con_risk_assessments) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000027'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('ra_reference', 'Risk Assessment Reference', 'text', 0, NULL, NULL, NULL),
  ('activity', 'Activity', 'text', 1, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 2, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('company', 'Company', 'text', 3, NULL, NULL, NULL),
  ('assessor', 'Assessor', 'text', 4, NULL, NULL, NULL),
  ('assessment_date', 'Assessed', 'date', 5, NULL, NULL, NULL),
  ('review_date', 'Review By', 'date', 6, NULL, NULL, NULL),
  ('method_statement_ref', 'Method Statement', 'text', 7, NULL, NULL, NULL),
  ('hazards', 'Hazards and Controls', 'table', 8, 'Hazards & Controls', '[{"value":"hazard","label":"Hazard"},{"value":"who","label":"Who Is at Risk"},{"value":"before","label":"Risk Before","type":"select","options":["High","Medium","Low"]},{"value":"control","label":"Control"},{"value":"after","label":"Risk After","type":"select","options":["High","Medium","Low"]}]', NULL),
  ('initial_risk', 'Overall Risk Before Controls', 'dropdown', 9, 'Hazards & Controls', '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('residual_risk', 'Overall Risk After Controls', 'dropdown', 10, 'Hazards & Controls', '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('approved_by', 'Approved By', 'text', 11, 'Approval & Briefing', NULL, NULL),
  ('approval_date', 'Approved', 'date', 12, 'Approval & Briefing', NULL, NULL),
  ('workers_briefed', 'Workers Briefed', 'number', 13, 'Approval & Briefing', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000027'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000027'::uuid;

-- ── Method Statements (con_method_statements) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('sequence_of_works', 'Sequence of Works', '[{"value":"step","label":"Step"},{"value":"activity","label":"Activity"},{"value":"responsible","label":"Responsible"}]'),
  ('labour', 'Labour', '[{"value":"role","label":"Role"},{"value":"number","label":"Number"}]'),
  ('plant_and_equipment', 'Plant and Equipment', '[{"value":"plant","label":"Plant"},{"value":"number","label":"Number"}]'),
  ('briefing_record', 'Briefing Record', '[{"value":"name","label":"Name"},{"value":"company","label":"Company"},{"value":"date","label":"Date","type":"date"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9002-000000000028'::uuid AND f.field_key = v.field_key;

-- ── Toolbox Talks (con_toolbox_talks) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000029'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('talk_reference', 'Talk Reference', 'text', 0, NULL, NULL, NULL),
  ('topic', 'Topic', 'dropdown', 1, NULL, '[{"value":"dropped_object","label":"Dropped object"},{"value":"vehicle_pedestrian","label":"Vehicle and pedestrian"},{"value":"slip_trip","label":"Slip or trip"},{"value":"work_at_height","label":"Work at height"},{"value":"electrical","label":"Electrical"},{"value":"lifting","label":"Lifting"},{"value":"excavation","label":"Excavation"},{"value":"fire","label":"Fire"},{"value":"housekeeping","label":"Housekeeping"},{"value":"environmental","label":"Environmental"}]', NULL),
  ('talk_date', 'Date', 'date', 2, NULL, NULL, NULL),
  ('delivered_by', 'Delivered By', 'text', 3, NULL, NULL, NULL),
  ('company', 'Company', 'text', 4, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 5, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('duration_minutes', 'Duration (minutes)', 'number', 6, NULL, NULL, NULL),
  ('language', 'Language', 'text', 7, NULL, NULL, NULL),
  ('key_points', 'Key Points', 'multi_line', 8, 'Content', NULL, NULL),
  ('related_event', 'Related Incident or Near Miss', 'text', 9, 'Content', NULL, NULL),
  ('attendees_count', 'Attendees', 'number', 10, 'Attendance', NULL, NULL),
  ('attendance_sheet', 'Attendance Sheet Reference', 'text', 11, 'Attendance', NULL, NULL),
  ('questions_raised', 'Questions Raised', 'multi_line', 12, 'Attendance', NULL, NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000029'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"delivered","label":"Delivered"},{"key":"cancelled","label":"Cancelled"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000029'::uuid;

-- ── Safety Inspections (con_safety_inspections) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000002a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('inspection_reference', 'Inspection Reference', 'text', 0, NULL, NULL, NULL),
  ('inspection_type', 'Inspection Type', 'dropdown', 1, NULL, '[{"value":"weekly","label":"Weekly site inspection"},{"value":"scaffold","label":"Scaffold / edge protection"},{"value":"excavation","label":"Excavation"},{"value":"lifting","label":"Lifting operations"},{"value":"fire","label":"Fire safety"},{"value":"environmental","label":"Environmental"},{"value":"director_tour","label":"Director safety tour"}]', NULL),
  ('zone', 'Zone', 'dropdown', 2, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('inspector', 'Inspector', 'text', 3, NULL, NULL, NULL),
  ('inspection_date', 'Date', 'date', 4, NULL, NULL, NULL),
  ('items_checked', 'Items Checked', 'number', 5, 'Score', NULL, NULL),
  ('items_compliant', 'Items Compliant', 'number', 6, 'Score', NULL, NULL),
  ('compliance', 'Compliance (%)', 'number', 7, 'Score', NULL, '{"op":"percent","numerator":"items_compliant","denominator":"items_checked","display":"percent"}'),
  ('findings', 'Findings', 'table', 8, 'Findings', '[{"value":"finding","label":"Finding"},{"value":"severity","label":"Severity","type":"select","options":["High","Medium","Low"]},{"value":"owner","label":"Action Owner"},{"value":"due","label":"Due","type":"date"}]', NULL),
  ('good_practice', 'Good Practice Seen', 'multi_line', 9, 'Findings', NULL, NULL),
  ('notes', 'Notes', 'long_text', 10, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000002a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"scheduled","label":"Scheduled"},{"key":"actions_open","label":"Complete – Actions Open"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000002a'::uuid;

-- ── Incidents (con_hse_incidents) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000002b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('incident_reference', 'Incident Reference', 'text', 0, NULL, NULL, NULL),
  ('incident_type', 'Incident Type', 'dropdown', 1, NULL, '[{"value":"injury","label":"Injury"},{"value":"dangerous_occurrence","label":"Dangerous occurrence"},{"value":"property_damage","label":"Property damage"},{"value":"environmental","label":"Environmental"},{"value":"fire","label":"Fire"},{"value":"security","label":"Security"}]', NULL),
  ('severity', 'Severity', 'dropdown', 2, NULL, '[{"value":"lost_time","label":"Lost-time injury"},{"value":"medical","label":"Medical treatment"},{"value":"first_aid","label":"First aid"},{"value":"no_injury","label":"No injury"}]', NULL),
  ('incident_date', 'Date', 'date', 3, NULL, NULL, NULL),
  ('incident_time', 'Time', 'text', 4, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 5, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('location', 'Location', 'text', 6, NULL, NULL, NULL),
  ('company', 'Company', 'text', 7, NULL, NULL, NULL),
  ('persons_involved', 'People Involved', 'number', 8, NULL, NULL, NULL),
  ('what_happened', 'What Happened', 'long_text', 9, 'Details', NULL, NULL),
  ('immediate_action', 'Immediate Action', 'long_text', 10, 'Details', NULL, NULL),
  ('reportable', 'Reportable to the Authority', 'boolean', 11, 'Reporting', NULL, NULL),
  ('reported_date', 'Reported to the Authority', 'date', 12, 'Reporting', NULL, NULL),
  ('lost_days', 'Days Lost', 'number', 13, 'Reporting', NULL, NULL),
  ('investigator', 'Investigator', 'text', 14, 'Investigation', NULL, NULL),
  ('root_cause_category', 'Root Cause Category', 'dropdown', 15, 'Investigation', '[{"value":"unsafe_act","label":"Unsafe act"},{"value":"unsafe_condition","label":"Unsafe condition"},{"value":"equipment","label":"Equipment failure"},{"value":"procedure","label":"Procedure missing or wrong"},{"value":"supervision","label":"Supervision"},{"value":"weather","label":"Weather"}]', NULL),
  ('root_cause', 'Root Cause', 'long_text', 16, 'Investigation', NULL, NULL),
  ('corrective_actions', 'Corrective Actions', 'table', 17, 'Investigation', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('closed_date', 'Closed', 'date', 18, 'Investigation', NULL, NULL),
  ('notes', 'Notes', 'long_text', 19, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000002b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"under_investigation","label":"Under Investigation"},{"key":"actions_open","label":"Actions Open"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000002b'::uuid;

-- ── Near Misses (con_near_misses) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000002c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('near_miss_reference', 'Near Miss Reference', 'text', 0, NULL, NULL, NULL),
  ('report_date', 'Date', 'date', 1, NULL, NULL, NULL),
  ('reported_by', 'Reported By', 'text', 2, NULL, NULL, NULL),
  ('company', 'Company', 'text', 3, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 4, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('location', 'Location', 'text', 5, NULL, NULL, NULL),
  ('category', 'Category', 'dropdown', 6, NULL, '[{"value":"dropped_object","label":"Dropped object"},{"value":"vehicle_pedestrian","label":"Vehicle and pedestrian"},{"value":"slip_trip","label":"Slip or trip"},{"value":"work_at_height","label":"Work at height"},{"value":"electrical","label":"Electrical"},{"value":"lifting","label":"Lifting"},{"value":"excavation","label":"Excavation"},{"value":"fire","label":"Fire"},{"value":"housekeeping","label":"Housekeeping"},{"value":"environmental","label":"Environmental"}]', NULL),
  ('potential_severity', 'Could Have Caused', 'dropdown', 7, NULL, '[{"value":"minor","label":"Minor injury"},{"value":"serious","label":"Serious injury"},{"value":"fatal","label":"Fatal or major injury"},{"value":"damage","label":"Property damage only"}]', NULL),
  ('what_happened', 'What Happened', 'long_text', 8, 'Details', NULL, NULL),
  ('immediate_action', 'Immediate Action', 'long_text', 9, 'Details', NULL, NULL),
  ('reviewed_by', 'Reviewed By', 'text', 10, 'Review', NULL, NULL),
  ('review_date', 'Reviewed', 'date', 11, 'Review', NULL, NULL),
  ('lessons', 'Lessons Learned', 'multi_line', 12, 'Review', NULL, NULL),
  ('action_reference', 'Corrective Action', 'text', 13, 'Review', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000002c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"reported","label":"Reported"},{"key":"reviewed","label":"Reviewed"},{"key":"action_raised","label":"Action Raised"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000002c'::uuid;

-- ── Corrective Actions (con_hse_corrective_actions) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000002d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('action_reference', 'Action Reference', 'text', 0, NULL, NULL, NULL),
  ('source', 'Source', 'dropdown', 1, NULL, '[{"value":"incident","label":"Incident"},{"value":"near_miss","label":"Near miss"},{"value":"inspection","label":"Safety inspection"},{"value":"audit","label":"Audit"},{"value":"observation","label":"Observation"}]', NULL),
  ('source_reference', 'Source Reference', 'text', 2, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 3, NULL, NULL, NULL),
  ('priority', 'Priority', 'dropdown', 4, NULL, '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('raised_date', 'Raised', 'date', 5, NULL, NULL, NULL),
  ('due_date', 'Due', 'date', 6, NULL, NULL, NULL),
  ('action', 'Action', 'long_text', 7, 'Action', NULL, NULL),
  ('closed_date', 'Closed', 'date', 8, 'Action', NULL, NULL),
  ('verified_by', 'Verified By', 'text', 9, 'Verification', NULL, NULL),
  ('verification_date', 'Verified', 'date', 10, 'Verification', NULL, NULL),
  ('effective', 'Effective', 'boolean', 11, 'Verification', NULL, NULL),
  ('evidence', 'Evidence', 'table', 12, 'Verification', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000002d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"overdue","label":"Overdue"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000002d'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9002-000000000024'::uuid, '00000000-0000-4000-9002-000000000025'::uuid, '00000000-0000-4000-9002-000000000026'::uuid, '00000000-0000-4000-9002-000000000027'::uuid, '00000000-0000-4000-9002-000000000028'::uuid, '00000000-0000-4000-9002-000000000029'::uuid, '00000000-0000-4000-9002-00000000002a'::uuid, '00000000-0000-4000-9002-00000000002b'::uuid, '00000000-0000-4000-9002-00000000002c'::uuid, '00000000-0000-4000-9002-00000000002d'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
