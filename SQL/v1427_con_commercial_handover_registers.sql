-- ============================================================================
-- v1427: Commercial, Certificates, Handover & Commissioning registers — full forms with tabs (Construction & Engineering)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the thirteen Construction & Engineering registers under Commercial, Progress Certificates and Handover & Commissioning: twelve had only Title / Description / Status, and the Commissioning Plan document (v1323) gets its lists with several parts as tables:
--   Bills of Quantities (con_bills_of_quantities): 13 fields — Details · Items · Totals · Approval · Notes
--   Valuations (con_valuations): 19 fields — Details · Valuation · Certification · Notes
--   Variations (con_variations): 16 fields — Details · Scope · Value & Time · Agreement · Notes
--   Commercial Claims (con_commercial_claims): 14 fields — Details · Claim · Amounts · Settlement · Notes
--   Progress Certificates (con_progress_certificates): 17 fields — Details · Amounts · Payment · Approvals · Notes
--   Commissioning Plan (con_commissioning_plan): 36 fields — Details · Introduction · Systems & Stages · Testing & Acceptance · Safety & Permits · Handover · Risks & Roles · Glossary & Appendices · Document Control
--   Pre-Commissioning (con_pre_commissioning): 11 fields — Details · Checks · Notes
--   Testing & Commissioning (con_testing_commissioning): 12 fields — Details · Results · Notes
--   As-Built Drawings (con_as_built_drawings): 12 fields — Details · Review · Notes
--   O&M Manuals (con_om_manuals): 13 fields — Details · Contents · Review · Notes
--   Training (con_handover_training): 15 fields — Details · Session · Attendance · Notes
--   Handover Certificates (con_handover_certificates): 10 fields — Details · Issue · Notes
--   Defects Liability (con_defects_liability): 14 fields — Details · Period & Retention · Defects · Close-Out · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Net valuation, amount due, certified against claimed, agreed against quoted, recovery rate, amount outstanding, attendance rate and defect closure are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs. Document registers keep
-- their sign-off workflow (In Review / Approved only by sign-off).
-- No records exist yet for these registers, so no saved values change. All fields optional, vendor-neutral
-- (rule 26). Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1428. Prerequisites: v948, v1321, v1323, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── Bills of Quantities (con_bills_of_quantities) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000037'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('bill_reference', 'Bill Reference', 'text', 0, NULL, NULL, NULL),
  ('bill_section', 'Section', 'dropdown', 1, NULL, '[{"value":"preliminaries","label":"Preliminaries"},{"value":"substructure","label":"Substructure"},{"value":"frame","label":"Frame"},{"value":"envelope","label":"Envelope"},{"value":"floor","label":"Floor slab"},{"value":"services","label":"Building services"},{"value":"external","label":"External works"},{"value":"fit_out","label":"Fit-out"},{"value":"specialist","label":"Specialist installations"},{"value":"provisional","label":"Provisional sums"}]', NULL),
  ('package', 'Package', 'text', 2, NULL, NULL, NULL),
  ('measured_by', 'Measured By', 'text', 3, NULL, NULL, NULL),
  ('measurement_basis', 'Measurement Rules', 'text', 4, NULL, NULL, NULL),
  ('revision', 'Revision', 'text', 5, NULL, NULL, NULL),
  ('items', 'Main Items', 'table', 6, 'Items', '[{"value":"item","label":"Item"},{"value":"description","label":"Description"},{"value":"unit","label":"Unit"},{"value":"quantity","label":"Quantity"},{"value":"rate","label":"Rate"}]', NULL),
  ('bill_total', 'Bill Total', 'currency', 7, 'Totals', NULL, NULL),
  ('provisional_sums', 'Provisional Sums Included', 'currency', 8, 'Totals', NULL, NULL),
  ('contingency', 'Contingency Included', 'currency', 9, 'Totals', NULL, NULL),
  ('approved_by', 'Approved By', 'text', 10, 'Approval', NULL, NULL),
  ('approval_date', 'Approved', 'date', 11, 'Approval', NULL, NULL),
  ('notes', 'Notes', 'long_text', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000037'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"in_review","label":"In Review"},{"key":"approved","label":"Approved"},{"key":"superseded","label":"Superseded"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000037'::uuid;

-- ── Valuations (con_valuations) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000038'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('valuation_number', 'Valuation Number', 'text', 0, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 1, NULL, NULL, NULL),
  ('valuation_date', 'Valuation Date', 'date', 2, NULL, NULL, NULL),
  ('period_end', 'Work Up To', 'date', 3, NULL, NULL, NULL),
  ('prepared_by', 'Prepared By', 'text', 4, NULL, NULL, NULL),
  ('work_done', 'Work Done to Date', 'currency', 5, 'Valuation', NULL, NULL),
  ('materials_on_site', 'Materials on Site', 'currency', 6, 'Valuation', NULL, NULL),
  ('variations_value', 'Variations to Date', 'currency', 7, 'Valuation', NULL, NULL),
  ('gross_valuation', 'Gross Valuation', 'currency', 8, 'Valuation', NULL, NULL),
  ('retention_amount', 'Retention', 'currency', 9, 'Valuation', NULL, NULL),
  ('net_valuation', 'Net Valuation', 'currency', 10, 'Valuation', NULL, '{"op":"difference","minuend":"gross_valuation","subtrahend":"retention_amount","decimals":2}'),
  ('previous_certified', 'Previously Certified', 'currency', 11, 'Valuation', NULL, NULL),
  ('amount_due', 'Amount Due This Valuation', 'currency', 12, 'Valuation', NULL, '{"op":"difference","minuend":"net_valuation","subtrahend":"previous_certified","decimals":2}'),
  ('certified_amount', 'Amount Certified', 'currency', 13, 'Certification', NULL, NULL),
  ('certified_vs_claimed', 'Certified vs Amount Due', 'currency', 14, 'Certification', NULL, '{"op":"difference","minuend":"certified_amount","subtrahend":"amount_due","decimals":2}'),
  ('certified_by', 'Certified By', 'text', 15, 'Certification', NULL, NULL),
  ('certified_date', 'Certified', 'date', 16, 'Certification', NULL, NULL),
  ('adjustments', 'Adjustments Made', 'multi_line', 17, 'Certification', NULL, NULL),
  ('notes', 'Notes', 'long_text', 18, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000038'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"certified","label":"Certified"},{"key":"disputed","label":"Disputed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000038'::uuid;

-- ── Variations (con_variations) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000039'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('variation_reference', 'Variation Reference', 'text', 0, NULL, NULL, NULL),
  ('origin', 'Origin', 'dropdown', 1, NULL, '[{"value":"client_instruction","label":"Client instruction"},{"value":"design_change","label":"Design change"},{"value":"site_instruction","label":"Site instruction"},{"value":"provisional_sum","label":"Provisional sum"},{"value":"regulation","label":"Regulation or authority"}]', NULL),
  ('instruction_reference', 'Instruction / Change Reference', 'text', 2, NULL, NULL, NULL),
  ('package', 'Package', 'text', 3, NULL, NULL, NULL),
  ('zone', 'Zone', 'dropdown', 4, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('date_instructed', 'Instructed', 'date', 5, NULL, NULL, NULL),
  ('scope', 'Scope of the Variation', 'long_text', 6, 'Scope', NULL, NULL),
  ('valuation_method', 'Valuation Method', 'dropdown', 7, 'Value & Time', '[{"value":"contract_rates","label":"Contract rates"},{"value":"star_rates","label":"New rates based on contract rates"},{"value":"quotation","label":"Quotation"},{"value":"daywork","label":"Daywork"}]', NULL),
  ('quoted_value', 'Quoted Value', 'currency', 8, 'Value & Time', NULL, NULL),
  ('assessed_value', 'Assessed Value', 'currency', 9, 'Value & Time', NULL, NULL),
  ('agreed_value', 'Agreed Value', 'currency', 10, 'Value & Time', NULL, NULL),
  ('agreed_vs_quoted', 'Agreed vs Quoted', 'currency', 11, 'Value & Time', NULL, '{"op":"difference","minuend":"agreed_value","subtrahend":"quoted_value","decimals":2}'),
  ('time_days', 'Time Impact (days)', 'number', 12, 'Value & Time', NULL, NULL),
  ('agreed_by', 'Agreed By', 'text', 13, 'Agreement', NULL, NULL),
  ('date_agreed', 'Agreed', 'date', 14, 'Agreement', NULL, NULL),
  ('notes', 'Notes', 'long_text', 15, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000039'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"proposed","label":"Proposed"},{"key":"approved","label":"Approved (Instructed)"},{"key":"valued","label":"Valued"},{"key":"agreed","label":"Agreed"},{"key":"rejected","label":"Rejected"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000039'::uuid;

-- ── Commercial Claims (con_commercial_claims) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000003a'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('claim_reference', 'Claim Reference', 'text', 0, NULL, NULL, NULL),
  ('claimant', 'Claimant', 'text', 1, NULL, NULL, NULL),
  ('against', 'Claim Against', 'text', 2, NULL, NULL, NULL),
  ('claim_type', 'Claim Type', 'dropdown', 3, NULL, '[{"value":"delay_damages","label":"Delay damages"},{"value":"insurance","label":"Insurance"},{"value":"third_party_damage","label":"Third-party damage"},{"value":"consultant_error","label":"Consultant error"},{"value":"back_charge","label":"Back charge"},{"value":"warranty","label":"Warranty"}]', NULL),
  ('event_date', 'Event Date', 'date', 4, NULL, NULL, NULL),
  ('notified_date', 'Notified', 'date', 5, NULL, NULL, NULL),
  ('basis', 'Basis of Claim', 'long_text', 6, 'Claim', NULL, NULL),
  ('evidence', 'Evidence', 'table', 7, 'Claim', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('amount_claimed', 'Amount Claimed', 'currency', 8, 'Amounts', NULL, NULL),
  ('amount_recovered', 'Amount Recovered', 'currency', 9, 'Amounts', NULL, NULL),
  ('recovery_rate', 'Recovered (%)', 'number', 10, 'Amounts', NULL, '{"op":"percent","numerator":"amount_recovered","denominator":"amount_claimed","display":"percent"}'),
  ('settled_by', 'Settled By', 'text', 11, 'Settlement', NULL, NULL),
  ('settlement_date', 'Settled', 'date', 12, 'Settlement', NULL, NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000003a'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"settled","label":"Settled"},{"key":"rejected","label":"Rejected"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000003a'::uuid;

-- ── Progress Certificates (con_progress_certificates) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000003b'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('certificate_number', 'Certificate Number', 'text', 0, NULL, NULL, NULL),
  ('valuation_reference', 'Valuation', 'text', 1, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 2, NULL, NULL, NULL),
  ('certificate_date', 'Certificate Date', 'date', 3, NULL, NULL, NULL),
  ('payment_due', 'Final Date for Payment', 'date', 4, NULL, NULL, NULL),
  ('gross_value', 'Gross Value Certified to Date', 'currency', 5, 'Amounts', NULL, NULL),
  ('retention', 'Less Retention', 'currency', 6, 'Amounts', NULL, NULL),
  ('net_value', 'Net Value', 'currency', 7, 'Amounts', NULL, '{"op":"difference","minuend":"gross_value","subtrahend":"retention","decimals":2}'),
  ('previous_certificates', 'Less Previous Certificates', 'currency', 8, 'Amounts', NULL, NULL),
  ('amount_certified', 'Amount Certified This Certificate', 'currency', 9, 'Amounts', NULL, '{"op":"difference","minuend":"net_value","subtrahend":"previous_certificates","decimals":2}'),
  ('paid_amount', 'Amount Paid', 'currency', 10, 'Payment', NULL, NULL),
  ('outstanding', 'Outstanding', 'currency', 11, 'Payment', NULL, '{"op":"difference","minuend":"amount_certified","subtrahend":"paid_amount","decimals":2}'),
  ('paid_date', 'Paid On', 'date', 12, 'Payment', NULL, NULL),
  ('payment_reference', 'Payment Reference', 'text', 13, 'Payment', NULL, NULL),
  ('certified_by', 'Certified By', 'text', 14, 'Approvals', NULL, NULL),
  ('approved_by', 'Approved for Payment By', 'text', 15, 'Approvals', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000003b'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"submitted","label":"Submitted"},{"key":"measured","label":"Measured"},{"key":"certified","label":"Certified"},{"key":"approved","label":"Approved"},{"key":"paid","label":"Paid"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000003b'::uuid;

-- ── Commissioning Plan (con_commissioning_plan) (document register, fields from v1322): lists with several parts become tables ──
UPDATE public.local_register_fields f
SET field_type = 'table', field_label = v.field_label, dropdown_options = v.columns::jsonb, updated_at = NOW()
FROM (VALUES
  ('systems_to_commission', 'Systems to Commission', '[{"value":"system","label":"System"},{"value":"contractor","label":"Contractor"},{"value":"witness","label":"Witnessed By"}]'),
  ('test_procedures', 'Test Procedures', '[{"value":"procedure","label":"Procedure"},{"value":"reference","label":"Reference"}]'),
  ('witness_and_hold_points', 'Witness and Hold Points', '[{"value":"point","label":"Point"},{"value":"witness","label":"Witness"}]'),
  ('performance_guarantees', 'Performance Guarantees', '[{"value":"guarantee","label":"Guarantee"},{"value":"value","label":"Value"}]'),
  ('oandm_training', 'O&M Training', '[{"value":"topic","label":"Topic"},{"value":"audience","label":"Audience"},{"value":"duration","label":"Duration"}]'),
  ('risks_mitigations', 'Risks and Mitigations', '[{"value":"risk","label":"Risk"},{"value":"mitigation","label":"Mitigation"}]'),
  ('roles_and_responsibilities', 'Roles and Responsibilities', '[{"value":"role","label":"Role"},{"value":"responsibility","label":"Responsibility"},{"value":"name","label":"Name"}]')
) AS v(field_key, field_label, columns)
WHERE f.register_id = '00000000-0000-4000-9002-00000000003c'::uuid AND f.field_key = v.field_key;

-- ── Pre-Commissioning (con_pre_commissioning) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000003d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('checklist_reference', 'Checklist Reference', 'text', 0, NULL, NULL, NULL),
  ('system', 'System', 'text', 1, NULL, NULL, NULL),
  ('equipment', 'Equipment / Area', 'text', 2, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 3, NULL, NULL, NULL),
  ('check_type', 'Check Type', 'dropdown', 4, NULL, '[{"value":"mechanical_completion","label":"Mechanical completion"},{"value":"flushing","label":"Cleaning and flushing"},{"value":"electrical","label":"Electrical checks"},{"value":"labelling","label":"Labelling"},{"value":"safety_devices","label":"Safety devices"},{"value":"documents","label":"Documents"}]', NULL),
  ('planned_date', 'Planned', 'date', 5, NULL, NULL, NULL),
  ('completed_date', 'Completed', 'date', 6, NULL, NULL, NULL),
  ('checks', 'Checks', 'table', 7, 'Checks', '[{"value":"check","label":"Check"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail","Open"]}]', NULL),
  ('open_items', 'Open Items', 'number', 8, 'Checks', NULL, NULL),
  ('signed_by', 'Signed Off By', 'text', 9, 'Checks', NULL, NULL),
  ('notes', 'Notes', 'long_text', 10, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000003d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"blocked","label":"Blocked"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000003d'::uuid;

-- ── Testing & Commissioning (con_testing_commissioning) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000003e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('test_reference', 'Test Reference', 'text', 0, NULL, NULL, NULL),
  ('system', 'System', 'text', 1, NULL, NULL, NULL),
  ('test_type', 'Test Type', 'dropdown', 2, NULL, '[{"value":"factory","label":"Factory acceptance"},{"value":"site","label":"Site acceptance"},{"value":"functional","label":"Functional"},{"value":"performance","label":"Performance"},{"value":"integrated","label":"Integrated systems"},{"value":"seasonal","label":"Seasonal"}]', NULL),
  ('procedure_reference', 'Procedure', 'text', 3, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 4, NULL, NULL, NULL),
  ('planned_date', 'Planned', 'date', 5, NULL, NULL, NULL),
  ('actual_date', 'Tested', 'date', 6, NULL, NULL, NULL),
  ('witnessed_by', 'Witnessed By', 'text', 7, NULL, NULL, NULL),
  ('results', 'Results', 'table', 8, 'Results', '[{"value":"parameter","label":"Parameter"},{"value":"required","label":"Required"},{"value":"measured","label":"Measured"},{"value":"result","label":"Result","type":"select","options":["Pass","Fail"]}]', NULL),
  ('certificate_reference', 'Certificate Reference', 'text', 9, 'Results', NULL, NULL),
  ('retest_date', 'Retest Date', 'date', 10, 'Results', NULL, NULL),
  ('notes', 'Notes', 'long_text', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000003e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"scheduled","label":"Scheduled"},{"key":"in_progress","label":"In Progress"},{"key":"passed","label":"Passed"},{"key":"failed","label":"Failed"},{"key":"retest","label":"Retest"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000003e'::uuid;

-- ── As-Built Drawings (con_as_built_drawings) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000003f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('drawing_number', 'Drawing Number', 'text', 0, NULL, NULL, NULL),
  ('discipline', 'Discipline', 'text', 1, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 2, NULL, NULL, NULL),
  ('construction_drawing', 'Construction Drawing It Replaces', 'text', 3, NULL, NULL, NULL),
  ('revision', 'As-Built Revision', 'text', 4, NULL, NULL, NULL),
  ('file_format', 'Format', 'dropdown', 5, NULL, '[{"value":"pdf","label":"PDF"},{"value":"cad","label":"CAD"},{"value":"model","label":"3D model"}]', NULL),
  ('due_date', 'Due', 'date', 6, 'Review', NULL, NULL),
  ('submitted_date', 'Submitted', 'date', 7, 'Review', NULL, NULL),
  ('reviewed_by', 'Reviewed By', 'text', 8, 'Review', NULL, NULL),
  ('review_date', 'Reviewed', 'date', 9, 'Review', NULL, NULL),
  ('comments', 'Comments', 'multi_line', 10, 'Review', NULL, NULL),
  ('notes', 'Notes', 'long_text', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000003f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"submitted","label":"Submitted"},{"key":"comments","label":"Returned with Comments"},{"key":"approved","label":"Approved"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000003f'::uuid;

-- ── O&M Manuals (con_om_manuals) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000040'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('manual_reference', 'Manual Reference', 'text', 0, NULL, NULL, NULL),
  ('system', 'System', 'text', 1, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 2, NULL, NULL, NULL),
  ('format', 'Format', 'dropdown', 3, NULL, '[{"value":"electronic","label":"Electronic"},{"value":"paper","label":"Paper"},{"value":"both","label":"Both"}]', NULL),
  ('sections', 'Sections', 'table', 4, 'Contents', '[{"value":"section","label":"Section"},{"value":"included","label":"Included","type":"select","options":["Yes","No","Draft"]}]', NULL),
  ('warranty_months', 'Warranty (months)', 'number', 5, 'Contents', NULL, NULL),
  ('spares_list', 'Spare Parts List Included', 'boolean', 6, 'Contents', NULL, NULL),
  ('due_date', 'Due', 'date', 7, 'Review', NULL, NULL),
  ('submitted_date', 'Submitted', 'date', 8, 'Review', NULL, NULL),
  ('reviewer', 'Reviewer', 'text', 9, 'Review', NULL, NULL),
  ('review_date', 'Reviewed', 'date', 10, 'Review', NULL, NULL),
  ('comments', 'Comments', 'multi_line', 11, 'Review', NULL, NULL),
  ('notes', 'Notes', 'long_text', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000040'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"submitted","label":"Submitted"},{"key":"comments","label":"Returned with Comments"},{"key":"approved","label":"Approved"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000040'::uuid;

-- ── Training (con_handover_training) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000041'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('session_reference', 'Session Reference', 'text', 0, NULL, NULL, NULL),
  ('system', 'System', 'text', 1, NULL, NULL, NULL),
  ('trainer', 'Trainer', 'text', 2, NULL, NULL, NULL),
  ('trainer_company', 'Trainer Company', 'text', 3, NULL, NULL, NULL),
  ('audience', 'Audience', 'text', 4, NULL, NULL, NULL),
  ('planned_date', 'Planned', 'date', 5, 'Session', NULL, NULL),
  ('delivered_date', 'Delivered', 'date', 6, 'Session', NULL, NULL),
  ('duration_hours', 'Duration (hours)', 'number', 7, 'Session', NULL, NULL),
  ('topics', 'Topics', 'multi_line', 8, 'Session', NULL, NULL),
  ('attendees_planned', 'Attendees Planned', 'number', 9, 'Attendance', NULL, NULL),
  ('attendees_actual', 'Attendees', 'number', 10, 'Attendance', NULL, NULL),
  ('attendance_rate', 'Attendance (%)', 'number', 11, 'Attendance', NULL, '{"op":"percent","numerator":"attendees_actual","denominator":"attendees_planned","display":"percent"}'),
  ('materials_provided', 'Training Materials Provided', 'boolean', 12, 'Attendance', NULL, NULL),
  ('recording_reference', 'Recording Reference', 'text', 13, 'Attendance', NULL, NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000041'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"planned","label":"Planned"},{"key":"delivered","label":"Delivered"},{"key":"cancelled","label":"Cancelled"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000041'::uuid;

-- ── Handover Certificates (con_handover_certificates) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000042'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('certificate_reference', 'Certificate Reference', 'text', 0, NULL, NULL, NULL),
  ('certificate_type', 'Certificate Type', 'dropdown', 1, NULL, '[{"value":"sectional","label":"Sectional completion"},{"value":"practical","label":"Practical completion"},{"value":"making_good","label":"Making good defects"},{"value":"final","label":"Final certificate"},{"value":"fire","label":"Fire certificate"},{"value":"occupancy","label":"Occupancy certificate"},{"value":"electrical","label":"Electrical installation certificate"},{"value":"lift","label":"Lift certificate"},{"value":"sprinkler","label":"Sprinkler certificate"}]', NULL),
  ('section', 'Section / Zone', 'dropdown', 2, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('issued_by', 'Issued By', 'text', 3, NULL, NULL, NULL),
  ('milestone', 'Linked Milestone', 'text', 4, NULL, NULL, NULL),
  ('planned_date', 'Planned', 'date', 5, 'Issue', NULL, NULL),
  ('issued_date', 'Issued', 'date', 6, 'Issue', NULL, NULL),
  ('conditions', 'Conditions', 'multi_line', 7, 'Issue', NULL, NULL),
  ('outstanding_items', 'Outstanding Items at Issue', 'number', 8, 'Issue', NULL, NULL),
  ('notes', 'Notes', 'long_text', 9, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000042'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"issued","label":"Issued"},{"key":"withheld","label":"Withheld"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000042'::uuid;

-- ── Defects Liability (con_defects_liability) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000043'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('dlp_reference', 'DLP Reference', 'text', 0, NULL, NULL, NULL),
  ('contract', 'Contract / Package', 'text', 1, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 2, NULL, NULL, NULL),
  ('dlp_start', 'DLP Start', 'date', 3, 'Period & Retention', NULL, NULL),
  ('dlp_end', 'DLP End', 'date', 4, 'Period & Retention', NULL, NULL),
  ('retention_held', 'Retention Held', 'currency', 5, 'Period & Retention', NULL, NULL),
  ('defects_reported', 'Defects Reported', 'number', 6, 'Defects', NULL, NULL),
  ('defects_closed', 'Defects Closed', 'number', 7, 'Defects', NULL, NULL),
  ('closure_rate', 'Closed (%)', 'number', 8, 'Defects', NULL, '{"op":"percent","numerator":"defects_closed","denominator":"defects_reported","display":"percent"}'),
  ('defect_list', 'Defects', 'table', 9, 'Defects', '[{"value":"defect","label":"Defect"},{"value":"reported","label":"Reported","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","Fixed","Disputed"]}]', NULL),
  ('end_inspection', 'End-of-Period Inspection', 'date', 10, 'Close-Out', NULL, NULL),
  ('making_good_certificate', 'Making Good Certificate', 'date', 11, 'Close-Out', NULL, NULL),
  ('closeout_checks', 'Close-Out Checks', 'table', 12, 'Close-Out', '[{"value":"check","label":"Check"},{"value":"done","label":"Done","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000043'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"not_started","label":"Not Started"},{"key":"open","label":"Open"},{"key":"in_progress","label":"Defects Being Fixed"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000043'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9002-000000000037'::uuid, '00000000-0000-4000-9002-000000000038'::uuid, '00000000-0000-4000-9002-000000000039'::uuid, '00000000-0000-4000-9002-00000000003a'::uuid, '00000000-0000-4000-9002-00000000003b'::uuid, '00000000-0000-4000-9002-00000000003c'::uuid, '00000000-0000-4000-9002-00000000003d'::uuid, '00000000-0000-4000-9002-00000000003e'::uuid, '00000000-0000-4000-9002-00000000003f'::uuid, '00000000-0000-4000-9002-000000000040'::uuid, '00000000-0000-4000-9002-000000000041'::uuid, '00000000-0000-4000-9002-000000000042'::uuid, '00000000-0000-4000-9002-000000000043'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
