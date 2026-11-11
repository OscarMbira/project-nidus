-- ============================================================================
-- v1425: Quality Control & Progress Measurement registers — full forms with tabs (Construction & Engineering)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the nine Construction & Engineering registers under Quality Control and Progress Measurement: seven had only Title / Description / Status, and the ITP and Recovery Plan documents (v1323) get their lists with several parts as tables:
--   ITPs (con_itps): 25 fields — Details · References · Activities · Inspection Points · Responsibilities & Records · Risks & Roles · Glossary & Appendices · Document Control
--   Quality Inspections (con_quality_inspections): 14 fields — Details · Checks · Result · Notes
--   Test Certificates (con_test_certificates): 13 fields — Details · Dates & Result · Filing · Notes
--   NCRs (con_ncrs): 18 fields — Details · Details · Disposition · Close-Out · Notes
--   Snag / Punch List (con_snag_punch_list): 14 fields — Details · Close-Out · Notes
--   Corrective Actions (con_quality_corrective_actions): 14 fields — Details · Action · Verification · Notes
--   Progress Measurement (con_progress_measurement): 17 fields — Details · Physical Progress · Earned Value · Commentary · Notes
--   Delays (con_delays): 17 fields — Details · Impact · Response · Contract · Notes
--   Recovery Plans (con_recovery_plans): 32 fields — Details · Introduction · Delay Analysis · Recovery Strategy · Cost & Resources · Monitoring · Risks & Roles · Glossary & Appendices · Document Control
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Earned value variances and performance indices (schedule and cost, shown as %) are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. Document registers keep
-- their sign-off workflow (In Review / Approved only by sign-off).
-- No records exist yet for these registers, so no saved values change. All fields optional, vendor-neutral
-- (rule 26). Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1426. Prerequisites: v948, v1321, v1323, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── ITPs (con_itps) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('inspection_and_test_activities', 'Inspection and Test Activities', '[{"value":"activity","label":"Activity"},{"value":"check","label":"Check / Test"},{"value":"criteria","label":"Acceptance Criteria"},{"value":"point","label":"Point","type":"select","options":["Hold","Witness","Surveillance","Review"]}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9002-00000000002e'::uuid AND f.field_key = v.field_key;

-- ── Quality Inspections (con_quality_inspections) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000002f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('inspection_reference', 'Inspection Reference', 'text', 0, NULL, NULL, NULL),
  ('itp_reference', 'ITP Reference', 'text', 1, NULL, NULL, NULL),
  ('activity', 'Activity', 'text', 2, NULL, NULL, NULL),
  ('inspection_point', 'Inspection Point', 'dropdown', 3, NULL, '[{"value":"hold","label":"Hold point"},{"value":"witness","label":"Witness point"},{"value":"surveillance","label":"Surveillance"},{"value":"review","label":"Document review"}]', NULL),
  ('zone', 'Zone', 'dropdown', 4, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('location', 'Location', 'text', 5, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 6, NULL, NULL, NULL),
  ('inspector', 'Inspector', 'text', 7, NULL, NULL, NULL),
  ('inspection_date', 'Date', 'date', 8, NULL, NULL, NULL),
  ('checks', 'Checks', 'table', 9, 'Checks', '[{"value":"check","label":"Check"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","N/A"]}]', NULL),
  ('defects_found', 'Defects Found', 'number', 10, 'Result', NULL, NULL),
  ('ncr_reference', 'NCR Reference', 'text', 11, 'Result', NULL, NULL),
  ('photos_reference', 'Photo Reference', 'text', 12, 'Result', NULL, NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000002f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"scheduled","label":"Scheduled"},{"key":"passed","label":"Passed"},{"key":"passed_comments","label":"Passed with Comments"},{"key":"failed","label":"Failed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000002f'::uuid;

-- ── Test Certificates (con_test_certificates) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000030'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('certificate_reference', 'Certificate Reference', 'text', 0, NULL, NULL, NULL),
  ('test_type', 'Test', 'text', 1, NULL, NULL, NULL),
  ('element', 'Element / System', 'text', 2, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 3, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('issued_by', 'Issued By', 'text', 4, NULL, NULL, NULL),
  ('standard', 'Standard / Specification', 'text', 5, NULL, NULL, NULL),
  ('test_date', 'Tested', 'date', 6, 'Dates & Result', NULL, NULL),
  ('issue_date', 'Issued', 'date', 7, 'Dates & Result', NULL, NULL),
  ('result', 'Result', 'dropdown', 8, 'Dates & Result', '[{"value":"pass","label":"Pass"},{"value":"fail","label":"Fail"}]', NULL),
  ('linked_test', 'Linked Test Record', 'text', 9, 'Dates & Result', NULL, NULL),
  ('received_by', 'Received By', 'text', 10, 'Filing', NULL, NULL),
  ('handover_file', 'Handover File Section', 'text', 11, 'Filing', NULL, NULL),
  ('notes', 'Notes', 'long_text', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000030'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"issued","label":"Issued"},{"key":"rejected","label":"Rejected"},{"key":"superseded","label":"Superseded"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000030'::uuid;

-- ── NCRs (con_ncrs) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000031'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('ncr_reference', 'NCR Reference', 'text', 0, NULL, NULL, NULL),
  ('raised_by', 'Raised By', 'text', 1, NULL, NULL, NULL),
  ('raised_date', 'Raised', 'date', 2, NULL, NULL, NULL),
  ('contractor', 'Responsible Contractor', 'text', 3, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 4, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('location', 'Location', 'text', 5, NULL, NULL, NULL),
  ('category', 'Category', 'dropdown', 6, NULL, '[{"value":"workmanship","label":"Workmanship"},{"value":"material","label":"Material"},{"value":"dimensional","label":"Dimensional"},{"value":"testing","label":"Test failure"},{"value":"design","label":"Design"},{"value":"documentation","label":"Documentation"}]', NULL),
  ('severity', 'Severity', 'dropdown', 7, NULL, '[{"value":"major","label":"Major"},{"value":"minor","label":"Minor"}]', NULL),
  ('nonconformance', 'Non-Conformance', 'long_text', 8, 'Details', NULL, NULL),
  ('requirement', 'Requirement Not Met', 'text', 9, 'Details', NULL, NULL),
  ('disposition', 'Disposition', 'dropdown', 10, 'Disposition', '[{"value":"rework","label":"Rework"},{"value":"repair","label":"Repair"},{"value":"use_as_is","label":"Use as is (concession)"},{"value":"replace","label":"Reject and replace"}]', NULL),
  ('root_cause', 'Root Cause', 'long_text', 11, 'Disposition', NULL, NULL),
  ('corrective_action', 'Corrective Action', 'long_text', 12, 'Disposition', NULL, NULL),
  ('due_date', 'Due', 'date', 13, 'Disposition', NULL, NULL),
  ('cost_of_quality', 'Cost to Fix', 'currency', 14, 'Close-Out', NULL, NULL),
  ('verified_by', 'Verified By', 'text', 15, 'Close-Out', NULL, NULL),
  ('closed_date', 'Closed', 'date', 16, 'Close-Out', NULL, NULL),
  ('notes', 'Notes', 'long_text', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000031'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"verification","label":"Awaiting Verification"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000031'::uuid;

-- ── Snag / Punch List (con_snag_punch_list) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000032'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('snag_reference', 'Snag Reference', 'text', 0, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 1, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('location', 'Room / Location', 'text', 2, NULL, NULL, NULL),
  ('trade', 'Trade', 'text', 3, NULL, NULL, NULL),
  ('category', 'Category', 'dropdown', 4, NULL, '[{"value":"finish","label":"Finish"},{"value":"damage","label":"Damage"},{"value":"missing","label":"Missing item"},{"value":"incomplete","label":"Incomplete"},{"value":"cleaning","label":"Cleaning"},{"value":"functional","label":"Not working"}]', NULL),
  ('priority', 'Priority', 'dropdown', 5, NULL, '[{"value":"before_handover","label":"Before handover"},{"value":"after_handover","label":"Can be done after handover"}]', NULL),
  ('raised_by', 'Raised By', 'text', 6, 'Close-Out', NULL, NULL),
  ('raised_date', 'Raised', 'date', 7, 'Close-Out', NULL, NULL),
  ('responsible', 'Responsible', 'text', 8, 'Close-Out', NULL, NULL),
  ('due_date', 'Due', 'date', 9, 'Close-Out', NULL, NULL),
  ('closed_date', 'Closed', 'date', 10, 'Close-Out', NULL, NULL),
  ('verified_by', 'Verified By', 'text', 11, 'Close-Out', NULL, NULL),
  ('photo_reference', 'Photo Reference', 'text', 12, 'Close-Out', NULL, NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000032'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"ready_to_inspect","label":"Ready to Inspect"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000032'::uuid;

-- ── Corrective Actions (con_quality_corrective_actions) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000033'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('action_reference', 'Action Reference', 'text', 0, NULL, NULL, NULL),
  ('source', 'Source', 'dropdown', 1, NULL, '[{"value":"ncr","label":"NCR"},{"value":"audit","label":"Quality audit"},{"value":"inspection","label":"Inspection"},{"value":"client_comment","label":"Client comment"},{"value":"lessons","label":"Lessons learned"}]', NULL),
  ('source_reference', 'Source Reference', 'text', 2, NULL, NULL, NULL),
  ('owner', 'Owner', 'text', 3, NULL, NULL, NULL),
  ('priority', 'Priority', 'dropdown', 4, NULL, '[{"value":"high","label":"High"},{"value":"medium","label":"Medium"},{"value":"low","label":"Low"}]', NULL),
  ('raised_date', 'Raised', 'date', 5, NULL, NULL, NULL),
  ('due_date', 'Due', 'date', 6, NULL, NULL, NULL),
  ('action', 'Action', 'long_text', 7, 'Action', NULL, NULL),
  ('preventive', 'Prevents Recurrence (preventive)', 'boolean', 8, 'Action', NULL, NULL),
  ('closed_date', 'Closed', 'date', 9, 'Action', NULL, NULL),
  ('verified_by', 'Verified By', 'text', 10, 'Verification', NULL, NULL),
  ('effective', 'Effective', 'boolean', 11, 'Verification', NULL, NULL),
  ('evidence', 'Evidence', 'table', 12, 'Verification', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000033'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"overdue","label":"Overdue"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000033'::uuid;

-- ── Progress Measurement (con_progress_measurement) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000034'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('period', 'Period', 'text', 0, NULL, NULL, NULL),
  ('period_end', 'Period End', 'date', 1, NULL, NULL, NULL),
  ('package', 'Package', 'text', 2, NULL, NULL, NULL),
  ('measured_by', 'Measured By', 'text', 3, NULL, NULL, NULL),
  ('planned_percent', 'Planned Progress (%)', 'number', 4, 'Physical Progress', NULL, NULL),
  ('actual_percent', 'Actual Progress (%)', 'number', 5, 'Physical Progress', NULL, NULL),
  ('quantities', 'Key Quantities', 'table', 6, 'Physical Progress', '[{"value":"item","label":"Item"},{"value":"unit","label":"Unit"},{"value":"planned","label":"Planned to Date"},{"value":"done","label":"Done to Date"}]', NULL),
  ('budget', 'Budget at Completion', 'currency', 7, 'Earned Value', NULL, NULL),
  ('planned_value', 'Planned Value', 'currency', 8, 'Earned Value', NULL, NULL),
  ('earned_value', 'Earned Value', 'currency', 9, 'Earned Value', NULL, NULL),
  ('actual_cost', 'Actual Cost', 'currency', 10, 'Earned Value', NULL, NULL),
  ('schedule_variance', 'Schedule Variance (EV − PV)', 'currency', 11, 'Earned Value', NULL, '{"op":"difference","minuend":"earned_value","subtrahend":"planned_value","decimals":2}'),
  ('cost_variance', 'Cost Variance (EV − AC)', 'currency', 12, 'Earned Value', NULL, '{"op":"difference","minuend":"earned_value","subtrahend":"actual_cost","decimals":2}'),
  ('spi', 'Schedule Performance (EV ÷ PV, %)', 'number', 13, 'Earned Value', NULL, '{"op":"percent","numerator":"earned_value","denominator":"planned_value","display":"percent"}'),
  ('cpi', 'Cost Performance (EV ÷ AC, %)', 'number', 14, 'Earned Value', NULL, '{"op":"percent","numerator":"earned_value","denominator":"actual_cost","display":"percent"}'),
  ('commentary', 'Commentary', 'long_text', 15, 'Commentary', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000034'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"actual","label":"Actual Recorded"},{"key":"earned","label":"Earned Value Calculated"},{"key":"agreed","label":"Agreed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000034'::uuid;

-- ── Delays (con_delays) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000035'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('delay_reference', 'Delay Reference', 'text', 0, NULL, NULL, NULL),
  ('cause_category', 'Cause', 'dropdown', 1, NULL, '[{"value":"weather","label":"Weather"},{"value":"design","label":"Design information"},{"value":"procurement","label":"Procurement"},{"value":"labour","label":"Labour"},{"value":"plant","label":"Plant"},{"value":"client_change","label":"Client change"},{"value":"subcontractor","label":"Subcontractor"},{"value":"permits","label":"Permits and authorities"},{"value":"ground","label":"Ground conditions"},{"value":"utilities","label":"Utility companies"}]', NULL),
  ('responsible_party', 'Risk Owner Under the Contract', 'dropdown', 2, NULL, '[{"value":"contractor","label":"Contractor"},{"value":"client","label":"Client"},{"value":"neutral","label":"Neutral (time only)"},{"value":"third_party","label":"Third party"}]', NULL),
  ('zone', 'Zone', 'dropdown', 3, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('start_date', 'Start', 'date', 4, 'Impact', NULL, NULL),
  ('end_date', 'End', 'date', 5, 'Impact', NULL, NULL),
  ('delay_days', 'Delay (working days)', 'number', 6, 'Impact', NULL, NULL),
  ('critical_path', 'On the Critical Path', 'boolean', 7, 'Impact', NULL, NULL),
  ('affected_activities', 'Affected Activities', 'multi_line', 8, 'Impact', NULL, NULL),
  ('affected_milestones', 'Affected Milestones', 'text', 9, 'Impact', NULL, NULL),
  ('cost_impact', 'Cost Impact', 'currency', 10, 'Impact', NULL, NULL),
  ('description', 'What Happened', 'long_text', 11, 'Response', NULL, NULL),
  ('mitigation', 'Mitigation', 'multi_line', 12, 'Response', NULL, NULL),
  ('notice_given', 'Contract Notice Given', 'boolean', 13, 'Contract', NULL, NULL),
  ('notice_date', 'Notice Date', 'date', 14, 'Contract', NULL, NULL),
  ('claim_reference', 'Claim Reference', 'text', 15, 'Contract', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000035'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"identified","label":"Identified"},{"key":"assessed","label":"Assessed"},{"key":"mitigating","label":"Being Mitigated"},{"key":"resolved","label":"Resolved"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000035'::uuid;

-- ── Recovery Plans (con_recovery_plans) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('recovery_measures', 'Recovery Measures', '[{"value":"measure","label":"Measure"},{"value":"owner","label":"Owner"},{"value":"days","label":"Days Recovered"}]'),
  ('revised_milestones', 'Revised Milestones', '[{"value":"milestone","label":"Milestone"},{"value":"original","label":"Original Date","type":"date"},{"value":"revised","label":"Revised Date","type":"date"}]'),
  ('additional_resources', 'Additional Resources', '[{"value":"resource","label":"Resource"},{"value":"quantity","label":"Quantity"},{"value":"period","label":"Period"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9002-000000000036'::uuid AND f.field_key = v.field_key;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9002-00000000002e'::uuid, '00000000-0000-4000-9002-00000000002f'::uuid, '00000000-0000-4000-9002-000000000030'::uuid, '00000000-0000-4000-9002-000000000031'::uuid, '00000000-0000-4000-9002-000000000032'::uuid, '00000000-0000-4000-9002-000000000033'::uuid, '00000000-0000-4000-9002-000000000034'::uuid, '00000000-0000-4000-9002-000000000035'::uuid, '00000000-0000-4000-9002-000000000036'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
