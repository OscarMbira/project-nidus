-- ============================================================================
-- v1419: Contractors, Subcontractors & Permits registers — full forms with tabs (Construction & Engineering)
-- ============================================================================
-- Owner request 2026-11-11: best-practice fields, in logical tabs, for the eleven Construction & Engineering registers under Contractors, Subcontractors and Permits, which had only Title / Description / Status:
--   Contractor Register (con_contractor_register): 17 fields — Details · Insurance & Compliance · Commercial · Notes
--   Prequalification (con_prequalification): 18 fields — Details · Documents · Scores · Outcome · Notes
--   Appointments (con_appointments): 17 fields — Details · Key Terms · Documents & Signing · Notes
--   Contractor Work Packages (con_contractor_work_packages): 15 fields — Details · Scope · Dates & Value · Notes
--   Contractor Performance (con_contractor_performance): 15 fields — Details · Scores · KPIs · Feedback · Notes
--   Contractor Claims (con_contractor_claims): 19 fields — Details · Claimed & Agreed · Assessment · Decision · Notes
--   Contractor Closeout (con_contractor_closeout): 11 fields — Details · Checks & Evidence · Notes
--   Subcontractor Register (con_subcontractor_register): 14 fields — Details · Approval & Compliance · Mobilisation · Notes
--   Subcontractor Scope (con_subcontractor_scope): 13 fields — Details · Scope · Interfaces · Deliverables & Value · Notes
--   Subcontractor Performance (con_subcontractor_performance): 12 fields — Details · Scores · Feedback · Notes
--   Permit Compliance (con_permit_compliance): 12 fields — Details · Dates · Conditions · Inspections · Notes
-- Lists with several parts per line are tables (rule 67.1), with dropdown columns where the values are a
-- short fixed list. Prequalification and performance scores (average of 1–5 ratings, v1339), agreed claim percentages and work package completion are calculated fields, worked out on save.
-- Status workflows keep their existing keys and gain the states each register needs.
-- No records exist yet for these registers, so no saved values change. All fields optional, vendor-neutral
-- (rule 26). Platform register definitions, the Simulator reads the same system register definitions.
-- Sample records: v1420. Prerequisites: v948, v1321, v1323, v1326, v1375. Idempotent.
-- ============================================================================

BEGIN;

-- ── Contractor Register (con_contractor_register) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000000d'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('contractor_code', 'Contractor Code', 'text', 0, NULL, NULL, NULL),
  ('role', 'Role', 'dropdown', 1, NULL, '[{"value":"main_contractor","label":"Main contractor"},{"value":"design_consultant","label":"Design consultant"},{"value":"engineer","label":"Engineering consultant"},{"value":"cost_consultant","label":"Cost consultant"},{"value":"specialist","label":"Specialist contractor"},{"value":"commissioning","label":"Commissioning specialist"}]', NULL),
  ('registration_number', 'Company Registration Number', 'text', 2, NULL, NULL, NULL),
  ('address', 'Address', 'text', 3, NULL, NULL, NULL),
  ('contact_person', 'Contact Person', 'text', 4, NULL, NULL, NULL),
  ('contact_email', 'Contact Email', 'text', 5, NULL, NULL, NULL),
  ('contact_phone', 'Contact Phone', 'text', 6, NULL, NULL, NULL),
  ('insurances', 'Insurances', 'table', 7, 'Insurance & Compliance', '[{"value":"cover","label":"Cover"},{"value":"amount","label":"Amount"},{"value":"expiry","label":"Expiry","type":"date"}]', NULL),
  ('tax_clearance_expiry', 'Tax Clearance Expiry', 'date', 8, 'Insurance & Compliance', NULL, NULL),
  ('safety_accreditation', 'Safety Accreditation', 'text', 9, 'Insurance & Compliance', NULL, NULL),
  ('quality_certification', 'Quality Certification', 'text', 10, 'Insurance & Compliance', NULL, NULL),
  ('approved_until', 'Approved Until', 'date', 11, 'Insurance & Compliance', NULL, NULL),
  ('contract_value', 'Contract Value', 'currency', 12, 'Commercial', NULL, NULL),
  ('payment_terms', 'Payment Terms', 'text', 13, 'Commercial', NULL, NULL),
  ('retention_percent', 'Retention (%)', 'number', 14, 'Commercial', NULL, NULL),
  ('performance_bond', 'Performance Bond', 'currency', 15, 'Commercial', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000000d'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"prospective","label":"Prospective"},{"key":"prequalified","label":"Prequalified"},{"key":"appointed","label":"Appointed"},{"key":"not_selected","label":"Not Selected"},{"key":"demobilised","label":"Demobilised"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000000d'::uuid;

-- ── Prequalification (con_prequalification) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000000e'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('pq_reference', 'PQ Reference', 'text', 0, NULL, NULL, NULL),
  ('company', 'Company', 'text', 1, NULL, NULL, NULL),
  ('package', 'Package Applied For', 'text', 2, NULL, NULL, NULL),
  ('assessor', 'Assessor', 'text', 3, NULL, NULL, NULL),
  ('submission_date', 'Submitted', 'date', 4, NULL, NULL, NULL),
  ('assessment_date', 'Assessed', 'date', 5, NULL, NULL, NULL),
  ('documents', 'Documents', 'table', 6, 'Documents', '[{"value":"document","label":"Document"},{"value":"received","label":"Received","type":"select","options":["Yes","No","Expired"]}]', NULL),
  ('financial_score', 'Financial Standing (1 = poor, 5 = excellent)', 'number', 7, 'Scores', NULL, NULL),
  ('technical_score', 'Technical Capability (1 = poor, 5 = excellent)', 'number', 8, 'Scores', NULL, NULL),
  ('hse_score', 'Health, Safety & Environment (1 = poor, 5 = excellent)', 'number', 9, 'Scores', NULL, NULL),
  ('quality_score', 'Quality Management (1 = poor, 5 = excellent)', 'number', 10, 'Scores', NULL, NULL),
  ('experience_score', 'Similar Experience (1 = poor, 5 = excellent)', 'number', 11, 'Scores', NULL, NULL),
  ('overall_score', 'Overall Score', 'number', 12, 'Scores', NULL, '{"op":"average","fields":["financial_score","technical_score","hse_score","quality_score","experience_score"],"of":5,"decimals":0,"display":"percent"}'),
  ('pass_mark', 'Pass Mark (%)', 'number', 13, 'Scores', NULL, NULL),
  ('references_checked', 'References Checked', 'boolean', 14, 'Outcome', NULL, NULL),
  ('conditions', 'Conditions', 'multi_line', 15, 'Outcome', NULL, NULL),
  ('feedback', 'Feedback to the Company', 'long_text', 16, 'Outcome', NULL, NULL),
  ('notes', 'Notes', 'long_text', 17, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000000e'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"invited","label":"Invited"},{"key":"in_progress","label":"In Progress"},{"key":"passed","label":"Passed"},{"key":"passed_conditions","label":"Passed with Conditions"},{"key":"failed","label":"Failed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000000e'::uuid;

-- ── Appointments (con_appointments) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-00000000000f'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('appointment_reference', 'Appointment Reference', 'text', 0, NULL, NULL, NULL),
  ('appointee', 'Appointee', 'text', 1, NULL, NULL, NULL),
  ('service', 'Service / Scope', 'text', 2, NULL, NULL, NULL),
  ('contract_form', 'Form of Contract', 'dropdown', 3, NULL, '[{"value":"design_build","label":"Standard design and build contract"},{"value":"construction","label":"Standard construction contract"},{"value":"professional","label":"Professional services appointment"},{"value":"purchase_order","label":"Purchase order"},{"value":"call_off","label":"Framework call-off"}]', NULL),
  ('contract_value', 'Contract Value', 'currency', 4, NULL, NULL, NULL),
  ('start_date', 'Start Date', 'date', 5, NULL, NULL, NULL),
  ('end_date', 'End Date', 'date', 6, NULL, NULL, NULL),
  ('retention_percent', 'Retention (%)', 'number', 7, 'Key Terms', NULL, NULL),
  ('defects_period_months', 'Defects Period (months)', 'number', 8, 'Key Terms', NULL, NULL),
  ('damages_per_day', 'Delay Damages per Day', 'currency', 9, 'Key Terms', NULL, NULL),
  ('payment_terms', 'Payment Terms', 'text', 10, 'Key Terms', NULL, NULL),
  ('key_terms', 'Other Key Terms', 'multi_line', 11, 'Key Terms', NULL, NULL),
  ('contract_documents', 'Contract Documents', 'table', 12, 'Documents & Signing', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]', NULL),
  ('signed_by_client', 'Signed for the Client By', 'text', 13, 'Documents & Signing', NULL, NULL),
  ('signed_by_appointee', 'Signed for the Appointee By', 'text', 14, 'Documents & Signing', NULL, NULL),
  ('signed_date', 'Signed Date', 'date', 15, 'Documents & Signing', NULL, NULL),
  ('notes', 'Notes', 'long_text', 16, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-00000000000f'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"issued","label":"Issued for Signature"},{"key":"executed","label":"Executed"},{"key":"terminated","label":"Terminated"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-00000000000f'::uuid;

-- ── Contractor Work Packages (con_contractor_work_packages) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000010'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('wp_reference', 'Work Package Reference', 'text', 0, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 1, NULL, NULL, NULL),
  ('package_code', 'Construction Package', 'text', 2, NULL, NULL, NULL),
  ('zones', 'Zones', 'multi_select', 3, NULL, '[{"value":"zone_a","label":"Zone A – Warehouse"},{"value":"zone_b","label":"Zone B – Office block"},{"value":"zone_c","label":"Zone C – Yard and docks"},{"value":"zone_d","label":"Zone D – Access road and gatehouse"},{"value":"zone_e","label":"Zone E – Utilities"},{"value":"whole_site","label":"Whole site"}]', NULL),
  ('package_lead', 'Contractor Lead', 'text', 4, NULL, NULL, NULL),
  ('scope', 'Scope', 'long_text', 5, 'Scope', NULL, NULL),
  ('deliverables', 'Deliverables', 'table', 6, 'Scope', '[{"value":"deliverable","label":"Deliverable"},{"value":"due","label":"Due","type":"date"},{"value":"status","label":"Status","type":"select","options":["Not started","In progress","Done"]}]', NULL),
  ('interfaces', 'Interfaces', 'multi_line', 7, 'Scope', NULL, NULL),
  ('planned_start', 'Planned Start', 'date', 8, 'Dates & Value', NULL, NULL),
  ('planned_finish', 'Planned Finish', 'date', 9, 'Dates & Value', NULL, NULL),
  ('forecast_finish', 'Forecast Finish', 'date', 10, 'Dates & Value', NULL, NULL),
  ('value', 'Value', 'currency', 11, 'Dates & Value', NULL, NULL),
  ('earned_value', 'Earned to Date', 'currency', 12, 'Dates & Value', NULL, NULL),
  ('percent_complete', 'Complete (%)', 'number', 13, 'Dates & Value', NULL, '{"op":"percent","numerator":"earned_value","denominator":"value","display":"percent"}'),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000010'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"assigned","label":"Assigned"},{"key":"in_progress","label":"In Progress"},{"key":"on_hold","label":"On Hold"},{"key":"complete","label":"Complete"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000010'::uuid;

-- ── Contractor Performance (con_contractor_performance) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000011'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('review_period', 'Review Period', 'text', 0, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 1, NULL, NULL, NULL),
  ('reviewer', 'Reviewer', 'text', 2, NULL, NULL, NULL),
  ('review_date', 'Review Date', 'date', 3, NULL, NULL, NULL),
  ('programme_score', 'Programme (1 = poor, 5 = excellent)', 'number', 4, 'Scores', NULL, NULL),
  ('quality_score', 'Quality (1 = poor, 5 = excellent)', 'number', 5, 'Scores', NULL, NULL),
  ('hse_score', 'Health & Safety (1 = poor, 5 = excellent)', 'number', 6, 'Scores', NULL, NULL),
  ('commercial_score', 'Commercial (1 = poor, 5 = excellent)', 'number', 7, 'Scores', NULL, NULL),
  ('collaboration_score', 'Collaboration (1 = poor, 5 = excellent)', 'number', 8, 'Scores', NULL, NULL),
  ('overall_score', 'Overall Score', 'number', 9, 'Scores', NULL, '{"op":"average","fields":["programme_score","quality_score","hse_score","commercial_score","collaboration_score"],"of":5,"decimals":0,"display":"percent"}'),
  ('kpis', 'KPIs', 'table', 10, 'KPIs', '[{"value":"kpi","label":"KPI"},{"value":"target","label":"Target"},{"value":"actual","label":"Actual"},{"value":"met","label":"Met","type":"select","options":["Yes","No"]}]', NULL),
  ('strengths', 'Strengths', 'multi_line', 11, 'Feedback', NULL, NULL),
  ('improvements', 'Improvements Needed', 'multi_line', 12, 'Feedback', NULL, NULL),
  ('actions', 'Actions', 'table', 13, 'Feedback', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('notes', 'Notes', 'long_text', 14, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000011'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"excellent","label":"Excellent"},{"key":"satisfactory","label":"Satisfactory"},{"key":"needs_improvement","label":"Needs Improvement"},{"key":"unsatisfactory","label":"Unsatisfactory"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000011'::uuid;

-- ── Contractor Claims (con_contractor_claims) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000012'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('claim_reference', 'Claim Reference', 'text', 0, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 1, NULL, NULL, NULL),
  ('claim_type', 'Claim Type', 'dropdown', 2, NULL, '[{"value":"eot","label":"Extension of time"},{"value":"loss_expense","label":"Loss and expense"},{"value":"variation","label":"Valuation of a variation"},{"value":"disruption","label":"Disruption"},{"value":"acceleration","label":"Acceleration cost"}]', NULL),
  ('contract_clause', 'Contract Clause', 'text', 3, NULL, NULL, NULL),
  ('event_date', 'Event Date', 'date', 4, NULL, NULL, NULL),
  ('notice_date', 'Notice Date', 'date', 5, NULL, NULL, NULL),
  ('submitted_date', 'Submitted', 'date', 6, NULL, NULL, NULL),
  ('time_claimed_days', 'Time Claimed (days)', 'number', 7, 'Claimed & Agreed', NULL, NULL),
  ('time_agreed_days', 'Time Agreed (days)', 'number', 8, 'Claimed & Agreed', NULL, NULL),
  ('amount_claimed', 'Amount Claimed', 'currency', 9, 'Claimed & Agreed', NULL, NULL),
  ('amount_agreed', 'Amount Agreed', 'currency', 10, 'Claimed & Agreed', NULL, NULL),
  ('agreed_percent', 'Agreed (% of amount claimed)', 'number', 11, 'Claimed & Agreed', NULL, '{"op":"percent","numerator":"amount_agreed","denominator":"amount_claimed","display":"percent"}'),
  ('basis', 'Basis of Claim', 'long_text', 12, 'Assessment', NULL, NULL),
  ('assessor', 'Assessor', 'text', 13, 'Assessment', NULL, NULL),
  ('assessment', 'Assessment Summary', 'long_text', 14, 'Assessment', NULL, NULL),
  ('supporting_documents', 'Supporting Documents', 'table', 15, 'Assessment', '[{"value":"document","label":"Document"},{"value":"reference","label":"Reference"}]', NULL),
  ('decided_by', 'Decided By', 'text', 16, 'Decision', NULL, NULL),
  ('decision_date', 'Decision Date', 'date', 17, 'Decision', NULL, NULL),
  ('notes', 'Notes', 'long_text', 18, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000012'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"submitted","label":"Submitted"},{"key":"under_review","label":"Under Review"},{"key":"settled","label":"Settled"},{"key":"rejected","label":"Rejected"},{"key":"withdrawn","label":"Withdrawn"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000012'::uuid;

-- ── Contractor Closeout (con_contractor_closeout) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000013'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('closeout_reference', 'Closeout Reference', 'text', 0, NULL, NULL, NULL),
  ('contractor', 'Contractor', 'text', 1, NULL, NULL, NULL),
  ('item_category', 'Item', 'dropdown', 2, NULL, '[{"value":"final_account","label":"Final account agreed"},{"value":"retention","label":"Retention release"},{"value":"warranties","label":"Warranties and guarantees"},{"value":"as_builts","label":"As-built drawings"},{"value":"om_manuals","label":"O&M manuals"},{"value":"bonds","label":"Bond return"},{"value":"defects","label":"Defects cleared"},{"value":"insurance","label":"Insurance close-out"}]', NULL),
  ('responsible', 'Responsible', 'text', 3, NULL, NULL, NULL),
  ('due_date', 'Due Date', 'date', 4, NULL, NULL, NULL),
  ('completed_date', 'Completed', 'date', 5, NULL, NULL, NULL),
  ('value', 'Value (where money is involved)', 'currency', 6, NULL, NULL, NULL),
  ('checks', 'Checks', 'table', 7, 'Checks & Evidence', '[{"value":"check","label":"Check"},{"value":"done","label":"Done","type":"select","options":["Yes","Partly","No"]}]', NULL),
  ('evidence', 'Evidence', 'table', 8, 'Checks & Evidence', '[{"value":"evidence","label":"Evidence"},{"value":"reference","label":"Reference"}]', NULL),
  ('signed_off_by', 'Signed Off By', 'text', 9, 'Checks & Evidence', NULL, NULL),
  ('notes', 'Notes', 'long_text', 10, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000013'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"open","label":"Open"},{"key":"in_progress","label":"In Progress"},{"key":"closed","label":"Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000013'::uuid;

-- ── Subcontractor Register (con_subcontractor_register) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000014'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('subcontractor_code', 'Subcontractor Code', 'text', 0, NULL, NULL, NULL),
  ('trade', 'Trade', 'dropdown', 1, NULL, '[{"value":"groundworks","label":"Groundworks"},{"value":"steel","label":"Structural steel"},{"value":"roofing_cladding","label":"Roofing and cladding"},{"value":"flooring","label":"Industrial flooring"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"fire","label":"Fire protection"},{"value":"doors","label":"Doors and docks"},{"value":"racking","label":"Racking"},{"value":"landscaping","label":"Landscaping"},{"value":"concrete_supply","label":"Ready-mix concrete supply"},{"value":"fit_out","label":"Interior fit-out"}]', NULL),
  ('package', 'Package', 'text', 2, NULL, NULL, NULL),
  ('employed_by', 'Employed By', 'text', 3, NULL, NULL, NULL),
  ('contact_person', 'Contact Person', 'text', 4, NULL, NULL, NULL),
  ('contact_phone', 'Contact Phone', 'text', 5, NULL, NULL, NULL),
  ('order_value', 'Subcontract Value', 'currency', 6, 'Approval & Compliance', NULL, NULL),
  ('approved_by_client', 'Approved by the Client', 'boolean', 7, 'Approval & Compliance', NULL, NULL),
  ('insurance_expiry', 'Insurance Expiry', 'date', 8, 'Approval & Compliance', NULL, NULL),
  ('safety_accreditation', 'Safety Accreditation', 'text', 9, 'Approval & Compliance', NULL, NULL),
  ('workforce_peak', 'Peak Workforce', 'number', 10, 'Mobilisation', NULL, NULL),
  ('mobilised_date', 'Mobilised', 'date', 11, 'Mobilisation', NULL, NULL),
  ('demobilised_date', 'Demobilised', 'date', 12, 'Mobilisation', NULL, NULL),
  ('notes', 'Notes', 'long_text', 13, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000014'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"registered","label":"Registered"},{"key":"approved","label":"Approved"},{"key":"mobilised","label":"Mobilised"},{"key":"active","label":"Active"},{"key":"demobilised","label":"Demobilised"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000014'::uuid;

-- ── Subcontractor Scope (con_subcontractor_scope) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000015'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('scope_reference', 'Scope Reference', 'text', 0, NULL, NULL, NULL),
  ('subcontractor', 'Subcontractor', 'text', 1, NULL, NULL, NULL),
  ('trade', 'Trade', 'dropdown', 2, NULL, '[{"value":"groundworks","label":"Groundworks"},{"value":"steel","label":"Structural steel"},{"value":"roofing_cladding","label":"Roofing and cladding"},{"value":"flooring","label":"Industrial flooring"},{"value":"mechanical","label":"Mechanical"},{"value":"electrical","label":"Electrical"},{"value":"fire","label":"Fire protection"},{"value":"doors","label":"Doors and docks"},{"value":"racking","label":"Racking"},{"value":"landscaping","label":"Landscaping"},{"value":"concrete_supply","label":"Ready-mix concrete supply"},{"value":"fit_out","label":"Interior fit-out"}]', NULL),
  ('package', 'Package', 'text', 3, NULL, NULL, NULL),
  ('scope', 'Scope Description', 'long_text', 4, 'Scope', NULL, NULL),
  ('inclusions', 'Inclusions', 'multi_line', 5, 'Scope', NULL, NULL),
  ('exclusions', 'Exclusions', 'multi_line', 6, 'Scope', NULL, NULL),
  ('attendances', 'Attendances by the Main Contractor', 'multi_line', 7, 'Interfaces', NULL, NULL),
  ('drawings_specs', 'Drawings and Specifications', 'multi_line', 8, 'Interfaces', NULL, NULL),
  ('deliverables', 'Deliverables', 'table', 9, 'Deliverables & Value', '[{"value":"deliverable","label":"Deliverable"},{"value":"due","label":"Due","type":"date"}]', NULL),
  ('value', 'Subcontract Value', 'currency', 10, 'Deliverables & Value', NULL, NULL),
  ('agreed_date', 'Agreed Date', 'date', 11, 'Deliverables & Value', NULL, NULL),
  ('notes', 'Notes', 'long_text', 12, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000015'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"draft","label":"Draft"},{"key":"under_review","label":"Under Review"},{"key":"agreed","label":"Agreed"},{"key":"varied","label":"Varied"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000015'::uuid;

-- ── Subcontractor Performance (con_subcontractor_performance) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000016'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('review_period', 'Review Period', 'text', 0, NULL, NULL, NULL),
  ('subcontractor', 'Subcontractor', 'text', 1, NULL, NULL, NULL),
  ('reviewer', 'Reviewer', 'text', 2, NULL, NULL, NULL),
  ('review_date', 'Review Date', 'date', 3, NULL, NULL, NULL),
  ('programme_score', 'Programme (1 = poor, 5 = excellent)', 'number', 4, 'Scores', NULL, NULL),
  ('quality_score', 'Quality (1 = poor, 5 = excellent)', 'number', 5, 'Scores', NULL, NULL),
  ('safety_score', 'Safety (1 = poor, 5 = excellent)', 'number', 6, 'Scores', NULL, NULL),
  ('housekeeping_score', 'Housekeeping (1 = poor, 5 = excellent)', 'number', 7, 'Scores', NULL, NULL),
  ('overall_score', 'Overall Score', 'number', 8, 'Scores', NULL, '{"op":"average","fields":["programme_score","quality_score","safety_score","housekeeping_score"],"of":5,"decimals":0,"display":"percent"}'),
  ('issues', 'Issues', 'multi_line', 9, 'Feedback', NULL, NULL),
  ('actions', 'Actions', 'table', 10, 'Feedback', '[{"value":"action","label":"Action"},{"value":"owner","label":"Owner"},{"value":"due","label":"Due Date","type":"date"},{"value":"status","label":"Status","type":"select","options":["Open","In Progress","Done"]}]', NULL),
  ('notes', 'Notes', 'long_text', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000016'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"excellent","label":"Excellent"},{"key":"satisfactory","label":"Satisfactory"},{"key":"needs_improvement","label":"Needs Improvement"},{"key":"unsatisfactory","label":"Unsatisfactory"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000016'::uuid;

-- ── Permit Compliance (con_permit_compliance) ──
INSERT INTO public.local_register_fields
  (register_id, field_key, field_label, field_type, is_required, display_order, field_group, dropdown_options, calculation)
SELECT '00000000-0000-4000-9002-000000000017'::uuid, v.field_key, v.field_label, v.field_type, FALSE, v.display_order, v.field_group, v.dropdown_options::jsonb, v.calculation::jsonb
FROM (VALUES
  ('permit_reference', 'Permit Reference', 'text', 0, NULL, NULL, NULL),
  ('permit_type', 'Permit Type', 'dropdown', 1, NULL, '[{"value":"building_permit","label":"Building permit"},{"value":"planning","label":"Planning permission"},{"value":"highway","label":"Highway works licence"},{"value":"environmental","label":"Environmental permit"},{"value":"discharge","label":"Discharge consent"},{"value":"oversail","label":"Crane oversail agreement"},{"value":"hoarding","label":"Hoarding licence"},{"value":"noise","label":"Noise consent"},{"value":"fire","label":"Fire service approval"},{"value":"occupancy","label":"Occupancy certificate"}]', NULL),
  ('issuing_authority', 'Issuing Authority', 'text', 2, NULL, NULL, NULL),
  ('permit_holder', 'Permit Holder', 'text', 3, NULL, NULL, NULL),
  ('application_date', 'Applied', 'date', 4, 'Dates', NULL, NULL),
  ('issue_date', 'Issued', 'date', 5, 'Dates', NULL, NULL),
  ('expiry_date', 'Expires', 'date', 6, 'Dates', NULL, NULL),
  ('renewal_needed', 'Renewal Needed', 'boolean', 7, 'Dates', NULL, NULL),
  ('conditions', 'Conditions', 'table', 8, 'Conditions', '[{"value":"condition","label":"Condition"},{"value":"status","label":"Status","type":"select","options":["Met","Open","Not yet due"]}]', NULL),
  ('inspections', 'Inspections', 'table', 9, 'Inspections', '[{"value":"inspection","label":"Inspection"},{"value":"date","label":"Date","type":"date"},{"value":"result","label":"Result","type":"select","options":["Passed","Actions","Failed"]}]', NULL),
  ('fees', 'Fees', 'currency', 10, 'Inspections', NULL, NULL),
  ('notes', 'Notes', 'long_text', 11, 'Notes', NULL, NULL)
) AS v(field_key, field_label, field_type, display_order, field_group, dropdown_options, calculation)
WHERE EXISTS (SELECT 1 FROM public.local_registers WHERE id = '00000000-0000-4000-9002-000000000017'::uuid)
ON CONFLICT (register_id, field_key) DO UPDATE SET
  field_label = EXCLUDED.field_label, field_type = EXCLUDED.field_type, display_order = EXCLUDED.display_order,
  field_group = EXCLUDED.field_group, dropdown_options = EXCLUDED.dropdown_options, calculation = EXCLUDED.calculation,
  updated_at = NOW();

UPDATE public.local_registers
SET status_workflow = '[{"key":"pending","label":"Pending"},{"key":"compliant","label":"Compliant"},{"key":"non_compliant","label":"Non-Compliant"},{"key":"expired","label":"Expired / Closed"}]'::jsonb, updated_at = NOW()
WHERE id = '00000000-0000-4000-9002-000000000017'::uuid;

COMMIT;

-- Check: fields and tabs per register.
SELECT r.register_key, count(f.*) AS fields, count(DISTINCT COALESCE(f.field_group, 'Details')) AS tabs,
       count(*) FILTER (WHERE f.field_type = 'table') AS table_fields,
       count(*) FILTER (WHERE f.calculation IS NOT NULL) AS calculated_fields
FROM public.local_registers r JOIN public.local_register_fields f ON f.register_id = r.id
WHERE r.id IN ('00000000-0000-4000-9002-00000000000d'::uuid, '00000000-0000-4000-9002-00000000000e'::uuid, '00000000-0000-4000-9002-00000000000f'::uuid, '00000000-0000-4000-9002-000000000010'::uuid, '00000000-0000-4000-9002-000000000011'::uuid, '00000000-0000-4000-9002-000000000012'::uuid, '00000000-0000-4000-9002-000000000013'::uuid, '00000000-0000-4000-9002-000000000014'::uuid, '00000000-0000-4000-9002-000000000015'::uuid, '00000000-0000-4000-9002-000000000016'::uuid, '00000000-0000-4000-9002-000000000017'::uuid)
GROUP BY r.register_key ORDER BY r.register_key;
