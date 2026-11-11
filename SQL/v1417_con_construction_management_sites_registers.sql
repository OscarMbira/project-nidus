-- ============================================================================
-- v1417: Construction Management & Sites registers — full forms with tabs (Construction & Engineering)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the twelve Construction & Engineering registers under Construction Management and Sites: eleven had only Title / Description / Status, and the Site Logistics document (v1323) gets its lists with several parts as tables:
--   Construction Overview (con_overview): 26 fields — Details · Progress · Cost · Safety & Workforce · Highlights · Notes
--   Project Sites (con_project_sites): 16 fields — Details · Ownership & Constraints · Utilities · Environment · Notes
--   Construction Packages (con_construction_packages): 19 fields — Details · Scope · Value · Dates · Notes
--   Workfronts (con_workfronts): 18 fields — Details · Dates · Constraints · Progress · Notes
--   Construction Milestones (con_construction_milestones): 13 fields — Details · Dates · Criteria · Commercial · Notes
--   Site Setup (con_site_setup): 12 fields — Details · Dates & Cost · Checks · Notes
--   Site Access (con_site_access): 12 fields — Details · Controls · Usage · Notes
--   Site Logistics (con_site_logistics): 34 fields — Details · Introduction · Site Layout · Traffic & Deliveries · Storage & Handling · Security & Neighbours · Waste & Utilities · Risks & Roles · Glossary & Appendices · Document Control
--   Site Facilities (con_site_facilities): 13 fields — Details · Cost & Dates · Inspection · Notes
--   Site Diary (con_site_diary): 16 fields — Details · Workforce & Plant · Activities · Issues & Instructions · Notes
--   Daily Progress (con_daily_progress): 17 fields — Details · Quantities · Cumulative · Verification · Notes
--   Site Closeout (con_site_closeout): 10 fields — Details · Checks & Evidence · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Progress and cost variances, award and certification percentages, daily achievement and cumulative progress are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. Document registers keep
-- their sign-off workflow (In Review / Approved only by sign-off).
-- No records exist yet for these registers, so no saved values change. All fields optional, vendor-neutral
-- (rule 26). Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1418. Prerequisites: v948, v1321, v1323, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── Construction Overview (con_overview) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000001'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('report_period', 'Report Period', 'text', 0, NULL, NULL, NULL),
  ('period_end', 'Period End', 'date', 1, NULL, NULL, NULL),
  ('report_by', 'Prepared By', 'text', 2, NULL, NULL, NULL),
  ('overall_rag', 'Overall RAG', 'dropdown', 3, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('schedule_rag', 'Schedule RAG', 'dropdown', 4, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('cost_rag', 'Cost RAG', 'dropdown', 5, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('safety_rag', 'Safety RAG', 'dropdown', 6, NULL, '[{"value":"green","label":"Green"},{"value":"amber","label":"Amber"},{"value":"red","label":"Red"}]', NULL),
  ('planned_progress', 'Planned Progress (%)', 'number', 7, 'Progress', NULL, NULL),
  ('actual_progress', 'Actual Progress (%)', 'number', 8, 'Progress', NULL, NULL),
  ('progress_variance', 'Progress Variance (points)', 'number', 9, 'Progress', NULL, '{"op":"difference","minuend":"actual_progress","subtrahend":"planned_progress","decimals":2}'),
  ('contract_completion', 'Contract Completion Date', 'date', 10, 'Progress', NULL, NULL),
  ('forecast_completion', 'Forecast Completion Date', 'date', 11, 'Progress', NULL, NULL),
  ('contract_sum', 'Contract Sum', 'currency', 12, 'Cost', NULL, NULL),
  ('approved_variations', 'Approved Variations', 'currency', 13, 'Cost', NULL, NULL),
  ('certified_to_date', 'Certified to Date', 'currency', 14, 'Cost', NULL, NULL),
  ('forecast_final_cost', 'Forecast Final Cost', 'currency', 15, 'Cost', NULL, NULL),
  ('cost_variance', 'Forecast vs Contract Sum', 'currency', 16, 'Cost', NULL, '{"op":"difference","minuend":"forecast_final_cost","subtrahend":"contract_sum","decimals":2}'),
  ('workforce_on_site', 'Average Workforce on Site', 'number', 17, 'Safety & Workforce', NULL, NULL),
  ('hours_worked', 'Hours Worked in Period', 'number', 18, 'Safety & Workforce', NULL, NULL),
  ('lost_time_injuries', 'Lost-Time Injuries', 'number', 19, 'Safety & Workforce', NULL, NULL),
  ('near_misses', 'Near Misses Reported', 'number', 20, 'Safety & Workforce', NULL, NULL),
  ('achievements', 'Achievements This Period', 'multi_line', 21, 'Highlights', NULL, NULL),
  ('next_period', 'Planned Next Period', 'multi_line', 22, 'Highlights', NULL, NULL),
  ('key_issues', 'Key Issues', 'table', 23, 'Highlights', '[{"value":"issue","label":"Issue"},{"value":"impact","label":"Impact","type":"select","options":["High","Medium","Low"]},{"value":"action","label":"Action"},{"value":"owner","label":"Owner"}]', NULL),
  ('decisions_needed', 'Decisions Needed from the Client', 'multi_line', 24, 'Highlights', NULL, NULL),
  ('notes', 'Notes', 'long_text', 25, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000001'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"published","label":"Published"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000001'::uuid;

-- ── Project Sites (con_project_sites) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000002'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('site_code', 'Site Code', 'text', 0, NULL, NULL, NULL),
  ('site_type', 'Site Type', 'dropdown', 1, NULL, '[{"value":"main_site","label":"Main construction site"},{"value":"compound","label":"Contractor compound"},{"value":"laydown","label":"Laydown area"},{"value":"offsite_yard","label":"Off-site yard or factory"},{"value":"corridor","label":"Works corridor"},{"value":"car_park","label":"Car park"},{"value":"spoil_area","label":"Spoil or borrow area"}]', NULL),
  ('address', 'Address / Location', 'text', 2, NULL, NULL, NULL),
  ('area_m2', 'Area (m²)', 'number', 3, NULL, NULL, NULL),
  ('site_manager', 'Site Manager', 'text', 4, NULL, NULL, NULL),
  ('start_date', 'Start Date', 'date', 5, NULL, NULL, NULL),
  ('end_date', 'End Date', 'date', 6, NULL, NULL, NULL),
  ('land_owner', 'Land Owner', 'text', 7, 'Ownership & Constraints', NULL, NULL),
  ('access_agreement', 'Access Agreement Reference', 'text', 8, 'Ownership & Constraints', NULL, NULL),
  ('constraints', 'Constraints', 'multi_line', 9, 'Ownership & Constraints', NULL, NULL),
  ('neighbours', 'Neighbours', 'multi_line', 10, 'Ownership & Constraints', NULL, NULL),
  ('utilities', 'Utilities', 'table', 11, 'Utilities', '[{"value":"utility","label":"Utility"},{"value":"status","label":"Status","type":"select","options":["Available","Requested","Connected","Not needed"]}]', NULL),
  ('ground_conditions', 'Ground Conditions', 'text', 12, 'Environment', NULL, NULL),
  ('contamination_found', 'Contamination Found', 'boolean', 13, 'Environment', NULL, NULL),
  ('ecology_notes', 'Ecology Notes', 'long_text', 14, 'Environment', NULL, NULL),
  ('notes', 'Notes', 'long_text', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000002'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"active","label":"Active"},{"key":"demobilising","label":"Demobilising"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000002'::uuid;

-- ── Construction Packages (con_construction_packages) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000003'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('package_code', 'Package Code', 'text', 0, NULL, NULL, NULL),
  ('discipline', 'Discipline', 'dropdown', 1, NULL, '[{"value":"civil","label":"Civil"},{"value":"structural","label":"Structural"},{"value":"architectural","label":"Architectural"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"fire","label":"Fire protection"},{"value":"external_works","label":"External works"},{"value":"specialist","label":"Specialist"}]', NULL),
  ('zones', 'Zones', 'multi_select', 2, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('contractor', 'Contractor / Subcontractor', 'text', 3, NULL, NULL, NULL),
  ('package_manager', 'Package Manager', 'text', 4, NULL, NULL, NULL),
  ('contract_type', 'Contract Type', 'dropdown', 5, NULL, '[{"value":"lump_sum","label":"Lump sum"},{"value":"remeasurement","label":"Remeasurement"},{"value":"design_build","label":"Design and build"},{"value":"cost_reimbursable","label":"Cost reimbursable"}]', NULL),
  ('scope', 'Scope', 'long_text', 6, 'Scope', NULL, NULL),
  ('interfaces', 'Interfaces with Other Packages', 'multi_line', 7, 'Scope', NULL, NULL),
  ('budget', 'Budget', 'currency', 8, 'Value', NULL, NULL),
  ('awarded_value', 'Awarded Value', 'currency', 9, 'Value', NULL, NULL),
  ('award_variance', 'Award vs Budget', 'currency', 10, 'Value', NULL, '{"op":"difference","minuend":"awarded_value","subtrahend":"budget","decimals":2}'),
  ('certified_to_date', 'Certified to Date', 'currency', 11, 'Value', NULL, NULL),
  ('percent_certified', 'Certified (%)', 'number', 12, 'Value', NULL, '{"op":"percent","numerator":"certified_to_date","denominator":"awarded_value","display":"percent"}'),
  ('tender_issue', 'Tender Issued', 'date', 13, 'Dates', NULL, NULL),
  ('award_date', 'Award Date', 'date', 14, 'Dates', NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 15, 'Dates', NULL, NULL),
  ('planned_finish', 'Planned Finish', 'date', 16, 'Dates', NULL, NULL),
  ('forecast_finish', 'Forecast Finish', 'date', 17, 'Dates', NULL, NULL),
  ('notes', 'Notes', 'long_text', 18, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000003'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"tendering","label":"Tendering"},{"key":"awarded","label":"Awarded"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000003'::uuid;

-- ── Workfronts (con_workfronts) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000004'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('workfront_code', 'Workfront Code', 'text', 0, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 1, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('location', 'Location / Grid Lines', 'text', 2, NULL, NULL, NULL),
  ('package', 'Package', 'text', 3, NULL, NULL, NULL),
  ('activity', 'Current Activity', 'text', 4, NULL, NULL, NULL),
  ('supervisor', 'Supervisor', 'text', 5, NULL, NULL, NULL),
  ('crew_size', 'Crew Size', 'number', 6, NULL, NULL, NULL),
  ('start_date', 'Opened', 'date', 7, 'Dates', NULL, NULL),
  ('planned_end', 'Planned Close', 'date', 8, 'Dates', NULL, NULL),
  ('actual_end', 'Actual Close', 'date', 9, 'Dates', NULL, NULL),
  ('permits', 'Permits in Force', 'multi_select', 10, 'Constraints', '[{"value":"hot_work","label":"Hot work"},{"value":"work_at_height","label":"Work at height"},{"value":"lifting","label":"Lifting"},{"value":"excavation","label":"Excavation"},{"value":"confined_space","label":"Confined space"},{"value":"electrical_isolation","label":"Electrical isolation"}]', NULL),
  ('access_route', 'Access Route', 'text', 11, 'Constraints', NULL, NULL),
  ('constraints', 'Constraints', 'table', 12, 'Constraints', '[{"value":"constraint","label":"Constraint"},{"value":"status","label":"Status","type":"select","options":["Open","Cleared"]}]', NULL),
  ('unit', 'Unit', 'text', 13, 'Progress', NULL, NULL),
  ('planned_quantity', 'Planned Quantity', 'number', 14, 'Progress', NULL, NULL),
  ('completed_quantity', 'Completed Quantity', 'number', 15, 'Progress', NULL, NULL),
  ('percent_complete', 'Complete (%)', 'number', 16, 'Progress', NULL, '{"op":"percent","numerator":"completed_quantity","denominator":"planned_quantity","display":"percent"}'),
  ('notes', 'Notes', 'long_text', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000004'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"open","label":"Open"},{"key":"suspended","label":"Suspended"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000004'::uuid;

-- ── Construction Milestones (con_construction_milestones) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000005'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('milestone_code', 'Milestone Code', 'text', 0, NULL, NULL, NULL),
  ('milestone_type', 'Milestone Type', 'dropdown', 1, NULL, '[{"value":"contractual","label":"Contractual completion"},{"value":"sectional","label":"Sectional completion"},{"value":"key_date","label":"Key date"},{"value":"payment","label":"Payment milestone"},{"value":"internal","label":"Internal"}]', NULL),
  ('package', 'Package', 'text', 2, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 3, NULL, NULL, NULL),
  ('baseline_date', 'Baseline Date', 'date', 4, 'Dates', NULL, NULL),
  ('forecast_date', 'Forecast Date', 'date', 5, 'Dates', NULL, NULL),
  ('actual_date', 'Actual Date', 'date', 6, 'Dates', NULL, NULL),
  ('variance_days', 'Forecast Variance (days, + = late)', 'number', 7, 'Dates', NULL, NULL),
  ('criteria', 'Completion Criteria', 'table', 8, 'Criteria', '[{"value":"criterion","label":"Criterion"},{"value":"met","label":"Met","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('payment_linked', 'Payment Linked', 'boolean', 9, 'Commercial', NULL, NULL),
  ('payment_value', 'Payment Value', 'currency', 10, 'Commercial', NULL, NULL),
  ('damages_per_day', 'Delay Damages per Day', 'currency', 11, 'Commercial', NULL, NULL),
  ('notes', 'Notes', 'long_text', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000005'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"upcoming","label":"Upcoming"},{"key":"at_risk","label":"At Risk"},{"key":"met","label":"Met"},{"key":"missed","label":"Missed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000005'::uuid;

-- ── Site Setup (con_site_setup) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000006'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('item_code', 'Item Code', 'text', 0, NULL, NULL, NULL),
  ('category', 'Category', 'dropdown', 1, NULL, '[{"value":"hoarding_security","label":"Hoarding and security"},{"value":"welfare","label":"Welfare"},{"value":"offices","label":"Site offices"},{"value":"utilities","label":"Temporary utilities"},{"value":"access_roads","label":"Access roads and hardstanding"},{"value":"signage","label":"Signage"},{"value":"environmental","label":"Environmental controls"},{"value":"it_comms","label":"IT and communications"}]', NULL),
  ('location', 'Location', 'text', 2, NULL, NULL, NULL),
  ('responsible', 'Responsible', 'text', 3, NULL, NULL, NULL),
  ('supplier', 'Supplier', 'text', 4, NULL, NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 5, 'Dates & Cost', NULL, NULL),
  ('planned_end', 'Planned Finish', 'date', 6, 'Dates & Cost', NULL, NULL),
  ('actual_end', 'Actual Finish', 'date', 7, 'Dates & Cost', NULL, NULL),
  ('cost', 'Cost', 'currency', 8, 'Dates & Cost', NULL, NULL),
  ('checks', 'Checks Before Use', 'table', 9, 'Checks', '[{"value":"check","label":"Check"},{"value":"done","label":"Done","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('permits_needed', 'Permits or Consents Needed', 'multi_line', 10, 'Checks', NULL, NULL),
  ('notes', 'Notes', 'long_text', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000006'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"blocked","label":"Blocked"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000006'::uuid;

-- ── Site Access (con_site_access) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000007'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('access_reference', 'Access Reference', 'text', 0, NULL, NULL, NULL),
  ('access_type', 'Access Type', 'dropdown', 1, NULL, '[{"value":"vehicle_gate","label":"Vehicle gate"},{"value":"pedestrian","label":"Pedestrian turnstile"},{"value":"visitor","label":"Visitor access"},{"value":"worker_pass","label":"Worker pass"},{"value":"delivery_slot","label":"Delivery booking"},{"value":"emergency","label":"Emergency access"}]', NULL),
  ('location', 'Location', 'text', 2, NULL, NULL, NULL),
  ('hours', 'Hours', 'text', 3, NULL, NULL, NULL),
  ('responsible', 'Responsible', 'text', 4, NULL, NULL, NULL),
  ('control_method', 'Control Method', 'dropdown', 5, 'Controls', '[{"value":"guard","label":"Security guard"},{"value":"biometric","label":"Biometric turnstile"},{"value":"card","label":"Access card"},{"value":"booking","label":"Booking system"},{"value":"key","label":"Key holder"}]', NULL),
  ('induction_required', 'Site Induction Required', 'boolean', 6, 'Controls', NULL, NULL),
  ('ppe_required', 'PPE Required', 'multi_select', 7, 'Controls', '[{"value":"hard_hat","label":"Hard hat"},{"value":"boots","label":"Safety boots"},{"value":"hi_vis","label":"High-visibility clothing"},{"value":"gloves","label":"Gloves"},{"value":"glasses","label":"Eye protection"}]', NULL),
  ('conditions', 'Conditions of Access', 'multi_line', 8, 'Controls', NULL, NULL),
  ('daily_movements', 'Average Movements per Day', 'number', 9, 'Usage', NULL, NULL),
  ('issues', 'Issues', 'table', 10, 'Usage', '[{"value":"issue","label":"Issue"},{"value":"date","label":"Date","type":"date"},{"value":"action","label":"Action"}]', NULL),
  ('notes', 'Notes', 'long_text', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000007'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"granted","label":"Granted"},{"key":"suspended","label":"Suspended"},{"key":"revoked","label":"Revoked"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000007'::uuid;

-- ── Site Logistics (con_site_logistics) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('access_points', 'Access Points', '[{"value":"gate","label":"Gate"},{"value":"use","label":"Use"},{"value":"hours","label":"Hours"}]'),
  ('laydown_areas', 'Laydown Areas', '[{"value":"area","label":"Area"},{"value":"use","label":"Use"},{"value":"size","label":"Size (m²)"}]'),
  ('cranes_and_hoists', 'Cranes and Hoists', '[{"value":"equipment","label":"Equipment"},{"value":"location","label":"Location"},{"value":"period","label":"Period"}]'),
  ('temporary_utilities', 'Temporary Utilities', '[{"value":"utility","label":"Utility"},{"value":"source","label":"Source"},{"value":"capacity","label":"Capacity"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9002-000000000008'::uuid AND f.field_key = v.field_key;

-- ── Site Facilities (con_site_facilities) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000009'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('facility_code', 'Facility Code', 'text', 0, NULL, NULL, NULL),
  ('facility_type', 'Facility Type', 'dropdown', 1, NULL, '[{"value":"welfare_cabin","label":"Welfare cabin"},{"value":"toilets","label":"Toilets"},{"value":"canteen","label":"Canteen"},{"value":"drying_room","label":"Drying room"},{"value":"first_aid","label":"First aid room"},{"value":"office","label":"Site office"},{"value":"meeting_room","label":"Meeting room"},{"value":"parking","label":"Parking"},{"value":"storage","label":"Secure storage"},{"value":"wash","label":"Wheel wash"}]', NULL),
  ('location', 'Location', 'text', 2, NULL, NULL, NULL),
  ('capacity', 'Capacity (people / units)', 'number', 3, NULL, NULL, NULL),
  ('supplier', 'Supplier', 'text', 4, NULL, NULL, NULL),
  ('hire_or_owned', 'Hired or Owned', 'dropdown', 5, 'Cost & Dates', '[{"value":"hired","label":"Hired"},{"value":"owned","label":"Owned by contractor"},{"value":"client","label":"Provided by client"}]', NULL),
  ('weekly_cost', 'Weekly Cost', 'currency', 6, 'Cost & Dates', NULL, NULL),
  ('installed_date', 'Installed', 'date', 7, 'Cost & Dates', NULL, NULL),
  ('removal_date', 'Planned Removal', 'date', 8, 'Cost & Dates', NULL, NULL),
  ('cleaning_frequency', 'Cleaning Frequency', 'text', 9, 'Inspection', NULL, NULL),
  ('last_inspection', 'Last Inspection', 'date', 10, 'Inspection', NULL, NULL),
  ('inspection_result', 'Inspection Result', 'dropdown', 11, 'Inspection', '[{"value":"satisfactory","label":"Satisfactory"},{"value":"actions","label":"Actions needed"},{"value":"unsatisfactory","label":"Unsatisfactory"}]', NULL),
  ('notes', 'Notes', 'long_text', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000009'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"ordered","label":"Ordered"},{"key":"installed","label":"Installed"},{"key":"removed","label":"Removed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000009'::uuid;

-- ── Site Diary (con_site_diary) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000000a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('diary_date', 'Date', 'date', 0, NULL, NULL, NULL),
  ('written_by', 'Written By', 'text', 1, NULL, NULL, NULL),
  ('weather', 'Weather', 'dropdown', 2, NULL, '[{"value":"sunny","label":"Sunny"},{"value":"cloudy","label":"Cloudy"},{"value":"rain","label":"Rain"},{"value":"heavy_rain","label":"Heavy rain"},{"value":"windy","label":"High wind"},{"value":"storm","label":"Storm"}]', NULL),
  ('temperature', 'Temperature (°C)', 'number', 3, NULL, NULL, NULL),
  ('working_hours', 'Working Hours', 'text', 4, NULL, NULL, NULL),
  ('work_stopped', 'Work Stopped by Weather', 'boolean', 5, NULL, NULL, NULL),
  ('workforce', 'Workforce', 'table', 6, 'Workforce & Plant', '[{"value":"trade","label":"Trade / Company"},{"value":"number","label":"Number"}]', NULL),
  ('workforce_total', 'Total Workforce', 'number', 7, 'Workforce & Plant', NULL, NULL),
  ('plant_on_site', 'Plant on Site', 'multi_line', 8, 'Workforce & Plant', NULL, NULL),
  ('work_done', 'Work Done', 'multi_line', 9, 'Activities', NULL, NULL),
  ('deliveries', 'Deliveries', 'table', 10, 'Activities', '[{"value":"delivery","label":"Delivery"},{"value":"supplier","label":"Supplier"},{"value":"time","label":"Time"}]', NULL),
  ('visitors', 'Visitors', 'table', 11, 'Activities', '[{"value":"visitor","label":"Visitor"},{"value":"organisation","label":"Organisation"},{"value":"purpose","label":"Purpose"}]', NULL),
  ('delays_issues', 'Delays and Issues', 'multi_line', 12, 'Issues & Instructions', NULL, NULL),
  ('instructions_received', 'Instructions Received', 'multi_line', 13, 'Issues & Instructions', NULL, NULL),
  ('safety_observations', 'Safety Observations', 'multi_line', 14, 'Issues & Instructions', NULL, NULL),
  ('notes', 'Notes', 'long_text', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000000a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000000a'::uuid;

-- ── Daily Progress (con_daily_progress) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000000b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('report_date', 'Date', 'date', 0, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 1, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('package', 'Package', 'text', 2, NULL, NULL, NULL),
  ('activity', 'Activity', 'text', 3, NULL, NULL, NULL),
  ('foreman', 'Foreman', 'text', 4, NULL, NULL, NULL),
  ('crew', 'Crew Size', 'number', 5, NULL, NULL, NULL),
  ('unit', 'Unit', 'text', 6, 'Quantities', NULL, NULL),
  ('planned_today', 'Planned Today', 'number', 7, 'Quantities', NULL, NULL),
  ('achieved_today', 'Achieved Today', 'number', 8, 'Quantities', NULL, NULL),
  ('daily_achievement', 'Daily Achievement (%)', 'number', 9, 'Quantities', NULL, '{"op":"percent","numerator":"achieved_today","denominator":"planned_today","display":"percent"}'),
  ('cumulative_planned', 'Cumulative Planned', 'number', 10, 'Cumulative', NULL, NULL),
  ('cumulative_achieved', 'Cumulative Achieved', 'number', 11, 'Cumulative', NULL, NULL),
  ('cumulative_progress', 'Cumulative Achievement (%)', 'number', 12, 'Cumulative', NULL, '{"op":"percent","numerator":"cumulative_achieved","denominator":"cumulative_planned","display":"percent"}'),
  ('constraints', 'Constraints', 'multi_line', 13, 'Verification', NULL, NULL),
  ('verified_by', 'Verified By', 'text', 14, 'Verification', NULL, NULL),
  ('verified_date', 'Verified On', 'date', 15, 'Verification', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000000b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"recorded","label":"Recorded"},{"key":"verified","label":"Verified"},{"key":"queried","label":"Queried"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000000b'::uuid;

-- ── Site Closeout (con_site_closeout) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000000c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('item_code', 'Item Code', 'text', 0, NULL, NULL, NULL),
  ('category', 'Category', 'dropdown', 1, NULL, '[{"value":"demobilisation","label":"Demobilisation"},{"value":"reinstatement","label":"Reinstatement"},{"value":"utilities","label":"Utility disconnection"},{"value":"waste","label":"Waste removal"},{"value":"documents","label":"Documents and records"},{"value":"security","label":"Security handover"},{"value":"cleaning","label":"Final clean"},{"value":"permits","label":"Permit closure"}]', NULL),
  ('location', 'Location', 'text', 2, NULL, NULL, NULL),
  ('responsible', 'Responsible', 'text', 3, NULL, NULL, NULL),
  ('due_date', 'Due Date', 'date', 4, NULL, NULL, NULL),
  ('completed_date', 'Completed', 'date', 5, NULL, NULL, NULL),
  ('checks', 'Checks', 'table', 6, 'Checks & Evidence', '[{"value":"check","label":"Check"},{"value":"done","label":"Done","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('evidence', 'Evidence', 'table', 7, 'Checks & Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('signed_off_by', 'Signed Off By', 'text', 8, 'Checks & Evidence', NULL, NULL),
  ('notes', 'Notes', 'long_text', 9, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000000c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000000c'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9002-000000000001'::uuid, '00000000-0000-4000-9002-000000000002'::uuid, '00000000-0000-4000-9002-000000000003'::uuid, '00000000-0000-4000-9002-000000000004'::uuid, '00000000-0000-4000-9002-000000000005'::uuid, '00000000-0000-4000-9002-000000000006'::uuid, '00000000-0000-4000-9002-000000000007'::uuid, '00000000-0000-4000-9002-000000000008'::uuid, '00000000-0000-4000-9002-000000000009'::uuid, '00000000-0000-4000-9002-00000000000a'::uuid, '00000000-0000-4000-9002-00000000000b'::uuid, '00000000-0000-4000-9002-00000000000c'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
