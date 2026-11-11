-- ============================================================================
-- v1421: Design, RFIs, Instructions, Inspections & Materials registers — full forms with tabs (Construction & Engineering)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the twelve Construction & Engineering registers under Design & Engineering, RFIs, Site Instructions, Inspections and Materials: eleven had only Title / Description / Status, and the Inspection Plan document (v1323) gets its lists with several parts as tables:
--   Design Packages (con_design_packages): 17 fields — Details · Dates · Content · Review · Notes
--   Drawings (con_drawings): 14 fields — Details · Issue · Revision History · Notes
--   Specifications (con_specifications): 12 fields — Details · Content · Submittals · Approval · Notes
--   Design Reviews (con_design_reviews): 14 fields — Details · Participants · Comments · Outcome · Notes
--   Design Changes (con_design_changes): 15 fields — Details · Change · Impact · Decision · Notes
--   Technical Queries (con_technical_queries): 15 fields — Details · Query · Response · Notes
--   RFI Register (con_rfi_register): 15 fields — Details · Request · Response · Notes
--   Site Instructions (con_site_instructions): 16 fields — Details · Instruction · Implications · Close-Out · Notes
--   Inspection Plan (con_inspection_plan): 31 fields — Details · Introduction · Scope & Standards · Activities · Hold & Witness Points · Records & Nonconformance · Risks & Roles · Glossary & Appendices · Document Control
--   Site Inspections (con_site_inspections): 15 fields — Details · Checklist · Result · Notes
--   Material Submittals (con_material_submittals): 15 fields — Details · Documents · Review · Supply · Notes
--   Material Testing (con_material_testing): 15 fields — Details · Results · Follow-Up · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Drawing issue progress, review comment closure and test result against specification are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. Document registers keep
-- their sign-off workflow (In Review / Approved only by sign-off).
-- No records exist yet for these registers, so no saved values change. All fields optional, vendor-neutral
-- (rule 26). Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1422. Prerequisites: v948, v1321, v1323, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── Design Packages (con_design_packages) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000018'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('package_reference', 'Package Reference', 'text', 0, NULL, NULL, NULL),
  ('discipline', 'Discipline', 'dropdown', 1, NULL, '[{"value":"civil","label":"Civil"},{"value":"structural","label":"Structural"},{"value":"architectural","label":"Architectural"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"fire","label":"Fire protection"},{"value":"external_works","label":"External works"},{"value":"specialist","label":"Specialist"}]', NULL),
  ('design_stage', 'Design Stage', 'dropdown', 2, NULL, '[{"value":"concept","label":"Concept"},{"value":"developed","label":"Developed design"},{"value":"technical","label":"Technical design"},{"value":"construction","label":"Construction issue"}]', NULL),
  ('designer', 'Designer', 'text', 3, NULL, NULL, NULL),
  ('design_lead', 'Design Lead', 'text', 4, NULL, NULL, NULL),
  ('zones', 'Zones', 'multi_select', 5, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('planned_issue', 'Planned Issue', 'date', 6, 'Dates', NULL, NULL),
  ('forecast_issue', 'Forecast Issue', 'date', 7, 'Dates', NULL, NULL),
  ('actual_issue', 'Actual Issue', 'date', 8, 'Dates', NULL, NULL),
  ('needed_on_site', 'Needed on Site', 'date', 9, 'Dates', NULL, NULL),
  ('deliverables', 'Deliverables', 'table', 10, 'Content', '[{"value":"deliverable","label":"Deliverable"},{"value":"reference","label":"Reference"},{"value":"status","label":"Status","type":"select","options":["Not started","In progress","Issued"]}]', NULL),
  ('drawings_planned', 'Drawings Planned', 'number', 11, 'Content', NULL, NULL),
  ('drawings_issued', 'Drawings Issued', 'number', 12, 'Content', NULL, NULL),
  ('issued_percent', 'Issued (%)', 'number', 13, 'Content', NULL, '{"op":"percent","numerator":"drawings_issued","denominator":"drawings_planned","display":"percent"}'),
  ('reviewer', 'Reviewer', 'text', 14, 'Review', NULL, NULL),
  ('open_comments', 'Open Review Comments', 'number', 15, 'Review', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000018'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"in_review","label":"In Review"},{"key":"issued","label":"Issued"},{"key":"superseded","label":"Superseded"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000018'::uuid;

-- ── Drawings (con_drawings) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000019'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('drawing_number', 'Drawing Number', 'text', 0, NULL, NULL, NULL),
  ('revision', 'Current Revision', 'text', 1, NULL, NULL, NULL),
  ('discipline', 'Discipline', 'dropdown', 2, NULL, '[{"value":"civil","label":"Civil"},{"value":"structural","label":"Structural"},{"value":"architectural","label":"Architectural"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"fire","label":"Fire protection"},{"value":"external_works","label":"External works"},{"value":"specialist","label":"Specialist"}]', NULL),
  ('drawing_type', 'Drawing Type', 'dropdown', 3, NULL, '[{"value":"plan","label":"Plan"},{"value":"section","label":"Section"},{"value":"elevation","label":"Elevation"},{"value":"detail","label":"Detail"},{"value":"schematic","label":"Schematic"},{"value":"layout","label":"General arrangement"}]', NULL),
  ('scale', 'Scale', 'text', 4, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 5, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('design_package', 'Design Package', 'text', 6, NULL, NULL, NULL),
  ('originator', 'Originator', 'text', 7, NULL, NULL, NULL),
  ('suitability', 'Suitability', 'dropdown', 8, 'Issue', '[{"value":"information","label":"For information"},{"value":"comment","label":"For comment"},{"value":"construction","label":"For construction"},{"value":"as_built","label":"As built"}]', NULL),
  ('issue_date', 'Issue Date', 'date', 9, 'Issue', NULL, NULL),
  ('checked_by', 'Checked By', 'text', 10, 'Issue', NULL, NULL),
  ('approved_by', 'Approved By', 'text', 11, 'Issue', NULL, NULL),
  ('revision_history', 'Revision History', 'table', 12, 'Revision History', '[{"value":"revision","label":"Revision"},{"value":"date","label":"Date","type":"date"},{"value":"description","label":"Description"}]', NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000019'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"issued_for_review","label":"Issued for Review"},{"key":"approved_for_construction","label":"Approved for Construction"},{"key":"as_built","label":"As Built"},{"key":"superseded","label":"Superseded"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000019'::uuid;

-- ── Specifications (con_specifications) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000001a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('spec_reference', 'Specification Reference', 'text', 0, NULL, NULL, NULL),
  ('discipline', 'Discipline', 'dropdown', 1, NULL, '[{"value":"civil","label":"Civil"},{"value":"structural","label":"Structural"},{"value":"architectural","label":"Architectural"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"fire","label":"Fire protection"},{"value":"external_works","label":"External works"},{"value":"specialist","label":"Specialist"}]', NULL),
  ('revision', 'Revision', 'text', 2, NULL, NULL, NULL),
  ('author', 'Author', 'text', 3, NULL, NULL, NULL),
  ('standards', 'Standards Referenced', 'multi_line', 4, 'Content', NULL, NULL),
  ('materials_covered', 'Materials Covered', 'multi_line', 5, 'Content', NULL, NULL),
  ('performance_requirements', 'Performance Requirements', 'multi_line', 6, 'Content', NULL, NULL),
  ('testing_requirements', 'Testing Requirements', 'multi_line', 7, 'Content', NULL, NULL),
  ('submittals_required', 'Submittals Required', 'table', 8, 'Submittals', '[{"value":"submittal","label":"Submittal"},{"value":"when","label":"When"}]', NULL),
  ('approved_by', 'Approved By', 'text', 9, 'Approval', NULL, NULL),
  ('approval_date', 'Approval Date', 'date', 10, 'Approval', NULL, NULL),
  ('notes', 'Notes', 'long_text', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000001a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000001a'::uuid;

-- ── Design Reviews (con_design_reviews) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000001b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('review_reference', 'Review Reference', 'text', 0, NULL, NULL, NULL),
  ('design_package', 'Design Package', 'text', 1, NULL, NULL, NULL),
  ('design_stage', 'Design Stage', 'dropdown', 2, NULL, '[{"value":"concept","label":"Concept"},{"value":"developed","label":"Developed design"},{"value":"technical","label":"Technical design"},{"value":"construction","label":"Construction issue"}]', NULL),
  ('review_type', 'Review Type', 'dropdown', 3, NULL, '[{"value":"internal","label":"Internal design check"},{"value":"client","label":"Client review"},{"value":"buildability","label":"Buildability review"},{"value":"value_engineering","label":"Value engineering"},{"value":"design_risk","label":"Design safety risk review"},{"value":"independent","label":"Independent check"}]', NULL),
  ('chair', 'Chair', 'text', 4, NULL, NULL, NULL),
  ('review_date', 'Review Date', 'date', 5, NULL, NULL, NULL),
  ('participants', 'Participants', 'table', 6, 'Participants', '[{"value":"name","label":"Name"},{"value":"organisation","label":"Organisation"}]', NULL),
  ('comments', 'Comments', 'table', 7, 'Comments', '[{"value":"comment","label":"Comment"},{"value":"severity","label":"Severity","type":"select","options":["Critical","Major","Minor"]},{"value":"owner","label":"Owner"},{"value":"status","label":"Status","type":"select","options":["Open","Closed"]}]', NULL),
  ('comments_raised', 'Comments Raised', 'number', 8, 'Comments', NULL, NULL),
  ('comments_closed', 'Comments Closed', 'number', 9, 'Comments', NULL, NULL),
  ('closure_rate', 'Closed (%)', 'number', 10, 'Comments', NULL, '{"op":"percent","numerator":"comments_closed","denominator":"comments_raised","display":"percent"}'),
  ('outcome', 'Outcome', 'dropdown', 11, 'Outcome', '[{"value":"approved","label":"Approved"},{"value":"approved_comments","label":"Approved with comments"},{"value":"resubmit","label":"Revise and resubmit"}]', NULL),
  ('next_review', 'Next Review', 'date', 12, 'Outcome', NULL, NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000001b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"scheduled","label":"Scheduled"},{"key":"actions_open","label":"Held – Actions Open"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000001b'::uuid;

-- ── Design Changes (con_design_changes) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000001c'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('change_reference', 'Change Reference', 'text', 0, NULL, NULL, NULL),
  ('raised_by', 'Raised By', 'text', 1, NULL, NULL, NULL),
  ('raised_date', 'Raised', 'date', 2, NULL, NULL, NULL),
  ('reason', 'Reason', 'dropdown', 3, NULL, '[{"value":"client_request","label":"Client request"},{"value":"design_error","label":"Design error or omission"},{"value":"site_condition","label":"Site condition"},{"value":"value_engineering","label":"Value engineering"},{"value":"regulation","label":"Regulation or authority"},{"value":"coordination","label":"Coordination between designs"}]', NULL),
  ('affected_packages', 'Affected Packages', 'text', 4, NULL, NULL, NULL),
  ('description', 'Change Description', 'long_text', 5, 'Change', NULL, NULL),
  ('affected_drawings', 'Affected Drawings', 'multi_line', 6, 'Change', NULL, NULL),
  ('cost_impact', 'Cost Impact', 'currency', 7, 'Impact', NULL, NULL),
  ('time_impact_days', 'Time Impact (days)', 'number', 8, 'Impact', NULL, NULL),
  ('other_impacts', 'Other Impacts (safety, quality, operations)', 'multi_line', 9, 'Impact', NULL, NULL),
  ('approved_by', 'Decided By', 'text', 10, 'Decision', NULL, NULL),
  ('decision_date', 'Decision Date', 'date', 11, 'Decision', NULL, NULL),
  ('variation_reference', 'Variation Reference', 'text', 12, 'Decision', NULL, NULL),
  ('implemented_date', 'Implemented', 'date', 13, 'Decision', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000001c'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"proposed","label":"Proposed"},{"key":"approved","label":"Approved"},{"key":"implemented","label":"Implemented"},{"key":"rejected","label":"Rejected"},{"key":"withdrawn","label":"Withdrawn"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000001c'::uuid;

-- ── Technical Queries (con_technical_queries) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000001d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('tq_reference', 'TQ Reference', 'text', 0, NULL, NULL, NULL),
  ('raised_by', 'Raised By', 'text', 1, NULL, NULL, NULL),
  ('raised_date', 'Raised', 'date', 2, NULL, NULL, NULL),
  ('addressed_to', 'Addressed To', 'text', 3, NULL, NULL, NULL),
  ('discipline', 'Discipline', 'dropdown', 4, NULL, '[{"value":"civil","label":"Civil"},{"value":"structural","label":"Structural"},{"value":"architectural","label":"Architectural"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"fire","label":"Fire protection"},{"value":"external_works","label":"External works"},{"value":"specialist","label":"Specialist"}]', NULL),
  ('zone', 'Zone', 'dropdown', 5, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('required_by', 'Response Needed By', 'date', 6, NULL, NULL, NULL),
  ('question', 'Question', 'long_text', 7, 'Query', NULL, NULL),
  ('proposed_solution', 'Proposed Solution', 'long_text', 8, 'Query', NULL, NULL),
  ('references', 'Drawings and Specifications Referenced', 'multi_line', 9, 'Query', NULL, NULL),
  ('response', 'Response', 'long_text', 10, 'Response', NULL, NULL),
  ('responded_by', 'Responded By', 'text', 11, 'Response', NULL, NULL),
  ('response_date', 'Response Date', 'date', 12, 'Response', NULL, NULL),
  ('impact', 'Impact', 'dropdown', 13, 'Response', '[{"value":"none","label":"None"},{"value":"cost","label":"Cost"},{"value":"time","label":"Time"},{"value":"cost_time","label":"Cost and time"}]', NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000001d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"overdue","label":"Overdue"},{"key":"answered","label":"Answered"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000001d'::uuid;

-- ── RFI Register (con_rfi_register) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000001e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('rfi_reference', 'RFI Reference', 'text', 0, NULL, NULL, NULL),
  ('from', 'From', 'text', 1, NULL, NULL, NULL),
  ('to', 'To', 'text', 2, NULL, NULL, NULL),
  ('discipline', 'Discipline', 'dropdown', 3, NULL, '[{"value":"civil","label":"Civil"},{"value":"structural","label":"Structural"},{"value":"architectural","label":"Architectural"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"fire","label":"Fire protection"},{"value":"external_works","label":"External works"},{"value":"specialist","label":"Specialist"}]', NULL),
  ('priority', 'Priority', 'dropdown', 4, NULL, '[{"value":"urgent","label":"Urgent (2 days)"},{"value":"high","label":"High (5 days)"},{"value":"normal","label":"Normal (10 days)"}]', NULL),
  ('raised_date', 'Raised', 'date', 5, NULL, NULL, NULL),
  ('required_by', 'Response Needed By', 'date', 6, NULL, NULL, NULL),
  ('question', 'Question', 'long_text', 7, 'Request', NULL, NULL),
  ('drawings_referenced', 'Drawings Referenced', 'multi_line', 8, 'Request', NULL, NULL),
  ('response', 'Response', 'long_text', 9, 'Response', NULL, NULL),
  ('responded_by', 'Responded By', 'text', 10, 'Response', NULL, NULL),
  ('response_date', 'Response Date', 'date', 11, 'Response', NULL, NULL),
  ('impact', 'Impact', 'dropdown', 12, 'Response', '[{"value":"none","label":"None"},{"value":"cost","label":"Cost"},{"value":"time","label":"Time"},{"value":"cost_time","label":"Cost and time"}]', NULL),
  ('linked_instruction', 'Linked Site Instruction / Change', 'text', 13, 'Response', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000001e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"new","label":"New"},{"key":"open","label":"Open"},{"key":"responded","label":"Responded"},{"key":"overdue","label":"Overdue"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000001e'::uuid;

-- ── Site Instructions (con_site_instructions) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000001f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('si_reference', 'Instruction Reference', 'text', 0, NULL, NULL, NULL),
  ('issued_by', 'Issued By', 'text', 1, NULL, NULL, NULL),
  ('issued_to', 'Issued To', 'text', 2, NULL, NULL, NULL),
  ('issue_date', 'Issued', 'date', 3, NULL, NULL, NULL),
  ('instruction_type', 'Instruction Type', 'dropdown', 4, NULL, '[{"value":"variation","label":"Variation"},{"value":"clarification","label":"Clarification"},{"value":"opening_up","label":"Opening up for inspection"},{"value":"testing","label":"Additional testing"},{"value":"remove_defective","label":"Remove defective work"},{"value":"safety","label":"Safety"},{"value":"programme","label":"Programme or sequence"}]', NULL),
  ('zone', 'Zone', 'dropdown', 5, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('instruction', 'Instruction', 'long_text', 6, 'Instruction', NULL, NULL),
  ('reason', 'Reason', 'long_text', 7, 'Instruction', NULL, NULL),
  ('cost_implication', 'Cost Implication', 'boolean', 8, 'Implications', NULL, NULL),
  ('estimated_cost', 'Estimated Cost', 'currency', 9, 'Implications', NULL, NULL),
  ('time_implication_days', 'Time Implication (days)', 'number', 10, 'Implications', NULL, NULL),
  ('confirmed_in_writing', 'Confirmed in Writing', 'boolean', 11, 'Close-Out', NULL, NULL),
  ('actioned_date', 'Actioned', 'date', 12, 'Close-Out', NULL, NULL),
  ('variation_reference', 'Variation Reference', 'text', 13, 'Close-Out', NULL, NULL),
  ('closed_by', 'Closed By', 'text', 14, 'Close-Out', NULL, NULL),
  ('notes', 'Notes', 'long_text', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000001f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"new","label":"New"},{"key":"under_review","label":"Under Review"},{"key":"actioned","label":"Actioned"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000001f'::uuid;

-- ── Inspection Plan (con_inspection_plan) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('inspection_activities', 'Inspection Activities', '[{"value":"activity","label":"Activity"},{"value":"method","label":"Method"},{"value":"frequency","label":"Frequency"}]'),
  ('hold_points', 'Hold Points', '[{"value":"hold_point","label":"Hold Point"},{"value":"released_by","label":"Released By"}]'),
  ('witness_points', 'Witness Points', '[{"value":"witness_point","label":"Witness Point"},{"value":"witnessed_by","label":"Witnessed By"}]'),
  ('equipment_calibration', 'Equipment Calibration', '[{"value":"equipment","label":"Equipment"},{"value":"calibration","label":"Calibration Due"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9002-000000000020'::uuid AND f.field_key = v.field_key;

-- ── Site Inspections (con_site_inspections) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000021'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('inspection_reference', 'Inspection Reference', 'text', 0, NULL, NULL, NULL),
  ('inspection_type', 'Inspection Type', 'dropdown', 1, NULL, '[{"value":"hold_point","label":"Hold point"},{"value":"witness_point","label":"Witness point"},{"value":"pre_pour","label":"Pre-pour"},{"value":"general","label":"General inspection"},{"value":"authority","label":"Authority inspection"},{"value":"handover","label":"Pre-handover"}]', NULL),
  ('itp_reference', 'ITP Reference', 'text', 2, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 3, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('location', 'Location / Element', 'text', 4, NULL, NULL, NULL),
  ('requested_by', 'Requested By', 'text', 5, NULL, NULL, NULL),
  ('requested_for', 'Requested For', 'date', 6, NULL, NULL, NULL),
  ('inspector', 'Inspector', 'text', 7, NULL, NULL, NULL),
  ('inspection_date', 'Inspected On', 'date', 8, NULL, NULL, NULL),
  ('checklist', 'Checklist', 'table', 9, 'Checklist', '[{"value":"check","label":"Check"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","N/A"]}]', NULL),
  ('result', 'Result', 'dropdown', 10, 'Result', '[{"value":"pass","label":"Pass"},{"value":"pass_comments","label":"Pass with comments"},{"value":"fail","label":"Fail"}]', NULL),
  ('defects_found', 'Defects Found', 'number', 11, 'Result', NULL, NULL),
  ('ncr_reference', 'NCR Reference', 'text', 12, 'Result', NULL, NULL),
  ('reinspection_date', 'Re-Inspection Date', 'date', 13, 'Result', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000021'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"requested","label":"Requested"},{"key":"scheduled","label":"Scheduled"},{"key":"completed","label":"Completed"},{"key":"failed","label":"Failed – Re-Inspect"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000021'::uuid;

-- ── Material Submittals (con_material_submittals) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000022'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('submittal_reference', 'Submittal Reference', 'text', 0, NULL, NULL, NULL),
  ('material', 'Material / Product', 'text', 1, NULL, NULL, NULL),
  ('manufacturer', 'Manufacturer / Supplier', 'text', 2, NULL, NULL, NULL),
  ('spec_section', 'Specification Section', 'text', 3, NULL, NULL, NULL),
  ('package', 'Package', 'text', 4, NULL, NULL, NULL),
  ('submitted_by', 'Submitted By', 'text', 5, NULL, NULL, NULL),
  ('submitted_date', 'Submitted', 'date', 6, NULL, NULL, NULL),
  ('required_by', 'Approval Needed By', 'date', 7, NULL, NULL, NULL),
  ('documents', 'Documents Submitted', 'table', 8, 'Documents', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]', NULL),
  ('reviewer', 'Reviewer', 'text', 9, 'Review', NULL, NULL),
  ('review_date', 'Reviewed', 'date', 10, 'Review', NULL, NULL),
  ('review_comments', 'Review Comments', 'multi_line', 11, 'Review', NULL, NULL),
  ('lead_time_weeks', 'Lead Time (weeks)', 'number', 12, 'Supply', NULL, NULL),
  ('delivery_date', 'Planned Delivery', 'date', 13, 'Supply', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000022'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"approved","label":"Approved"},{"key":"approved_as_noted","label":"Approved as Noted"},{"key":"resubmit","label":"Revise and Resubmit"},{"key":"rejected","label":"Rejected"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000022'::uuid;

-- ── Material Testing (con_material_testing) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000023'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('test_reference', 'Test Reference', 'text', 0, NULL, NULL, NULL),
  ('material', 'Material', 'text', 1, NULL, NULL, NULL),
  ('test_type', 'Test Type', 'dropdown', 2, NULL, '[{"value":"concrete_cube","label":"Concrete cube strength"},{"value":"slump","label":"Concrete slump"},{"value":"compaction","label":"Soil compaction"},{"value":"plate_bearing","label":"Plate bearing"},{"value":"steel_tensile","label":"Steel tensile"},{"value":"weld_ndt","label":"Weld testing (non-destructive)"},{"value":"pull_out","label":"Anchor pull-out"},{"value":"coating","label":"Coating thickness"},{"value":"flatness","label":"Floor flatness"}]', NULL),
  ('element', 'Element / Location', 'text', 3, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 4, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('laboratory', 'Laboratory / Tester', 'text', 5, NULL, NULL, NULL),
  ('sample_date', 'Sampled', 'date', 6, 'Results', NULL, NULL),
  ('test_date', 'Tested', 'date', 7, 'Results', NULL, NULL),
  ('unit', 'Unit', 'text', 8, 'Results', NULL, NULL),
  ('specified_value', 'Specified Value (minimum)', 'number', 9, 'Results', NULL, NULL),
  ('result_value', 'Result', 'number', 10, 'Results', NULL, NULL),
  ('result_vs_spec', 'Result vs Specified (%)', 'number', 11, 'Results', NULL, '{"op":"percent","numerator":"result_value","denominator":"specified_value","display":"percent"}'),
  ('certificate_reference', 'Certificate Reference', 'text', 12, 'Follow-Up', NULL, NULL),
  ('ncr_reference', 'NCR Reference', 'text', 13, 'Follow-Up', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000023'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"scheduled","label":"Scheduled"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"},{"key":"retest","label":"Retest"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000023'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9002-000000000018'::uuid, '00000000-0000-4000-9002-000000000019'::uuid, '00000000-0000-4000-9002-00000000001a'::uuid, '00000000-0000-4000-9002-00000000001b'::uuid, '00000000-0000-4000-9002-00000000001c'::uuid, '00000000-0000-4000-9002-00000000001d'::uuid, '00000000-0000-4000-9002-00000000001e'::uuid, '00000000-0000-4000-9002-00000000001f'::uuid, '00000000-0000-4000-9002-000000000020'::uuid, '00000000-0000-4000-9002-000000000021'::uuid, '00000000-0000-4000-9002-000000000022'::uuid, '00000000-0000-4000-9002-000000000023'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
